CREATE TABLE organizations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE members (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  subject text NOT NULL, role text NOT NULL CHECK(role IN ('staff','contributor','maintainer','approver')),
  PRIMARY KEY(organization_id, subject)
);
CREATE TABLE requests (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL, problem text NOT NULL, acceptance_criteria text NOT NULL,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tools (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
  request_id uuid NOT NULL REFERENCES requests(id), name text NOT NULL,
  sponsor text NOT NULL, maintainer text NOT NULL, backup_maintainer text NOT NULL,
  review_date date NOT NULL, active_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE versions (
  id uuid PRIMARY KEY, tool_id uuid NOT NULL REFERENCES tools(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  implementation text NOT NULL CHECK(implementation='kijana-report-v1'),
  configuration jsonb NOT NULL, digest text NOT NULL,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tool_id, digest), UNIQUE(tool_id, id)
);
ALTER TABLE tools ADD CONSTRAINT active_version_belongs_to_tool
  FOREIGN KEY (id, active_version_id) REFERENCES versions(tool_id,id);
CREATE TABLE evaluations (
  id uuid PRIMARY KEY, version_id uuid NOT NULL REFERENCES versions(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  suite_version text NOT NULL, passed boolean NOT NULL, results jsonb NOT NULL,
  created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE approvals (
  id uuid PRIMARY KEY, version_id uuid NOT NULL UNIQUE REFERENCES versions(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  evaluation_id uuid NOT NULL REFERENCES evaluations(id),
  approved_by text NOT NULL, rationale text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE deployments (
  id uuid PRIMARY KEY, tool_id uuid NOT NULL REFERENCES tools(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  version_id uuid NOT NULL REFERENCES versions(id), previous_version_id uuid REFERENCES versions(id),
  activated_by text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id), actor text NOT NULL,
  action text NOT NULL, entity_id uuid NOT NULL, details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX requests_org ON requests(organization_id, created_at);
CREATE INDEX tools_org ON tools(organization_id, created_at);
CREATE INDEX audit_org ON audit_events(organization_id, id);
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Historical records are immutable'; END $$;
CREATE TRIGGER immutable_versions BEFORE UPDATE OR DELETE ON versions FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_evaluations BEFORE UPDATE OR DELETE ON evaluations FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_approvals BEFORE UPDATE OR DELETE ON approvals FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_deployments BEFORE UPDATE OR DELETE ON deployments FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
