CREATE TABLE hub_resources (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
 kind text NOT NULL CHECK(kind IN ('document','tool')), name text NOT NULL,
 owner text NOT NULL, active_version_id uuid, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), UNIQUE(organization_id,kind,name),
 FOREIGN KEY(organization_id,owner) REFERENCES members(organization_id,subject)
);
CREATE TABLE hub_versions (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, resource_id uuid NOT NULL,
 payload jsonb NOT NULL, digest text NOT NULL, created_by text NOT NULL,
 dependency_version_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), UNIQUE(resource_id,id),
 FOREIGN KEY(organization_id,resource_id) REFERENCES hub_resources(organization_id,id),
 FOREIGN KEY(organization_id,dependency_version_id) REFERENCES hub_versions(organization_id,id)
);
ALTER TABLE hub_resources ADD CONSTRAINT hub_active_belongs_to_resource
 FOREIGN KEY(id,active_version_id) REFERENCES hub_versions(resource_id,id);
CREATE TABLE hub_evaluations (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, version_id uuid NOT NULL,
 suite text NOT NULL, passed boolean NOT NULL, results jsonb NOT NULL,
 created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,version_id) REFERENCES hub_versions(organization_id,id)
);
CREATE TABLE hub_approvals (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, version_id uuid NOT NULL UNIQUE,
 evaluation_id uuid NOT NULL, approved_by text NOT NULL, rationale text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,version_id) REFERENCES hub_versions(organization_id,id),
 FOREIGN KEY(organization_id,evaluation_id) REFERENCES hub_evaluations(organization_id,id)
);
CREATE INDEX hub_resources_org_cursor ON hub_resources(organization_id,id);
CREATE INDEX hub_versions_resource ON hub_versions(organization_id,resource_id,created_at);
CREATE INDEX hub_dependencies ON hub_versions(organization_id,dependency_version_id);
CREATE TRIGGER immutable_hub_versions BEFORE UPDATE OR DELETE ON hub_versions FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_hub_evaluations BEFORE UPDATE OR DELETE ON hub_evaluations FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER immutable_hub_approvals BEFORE UPDATE OR DELETE ON hub_approvals FOR EACH ROW EXECUTE FUNCTION reject_mutation();
