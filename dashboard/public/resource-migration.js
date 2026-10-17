import {resources,seedCatalogue,catalogueDepartments} from './resource-catalogue.js';

// Only this release's additions belong in the migration. Missing older seeds may
// represent deliberate local deletions and must never be recreated.
const additions=new Set([
  'growth-reporting','example-grants','example-programme-reporting',
  'example-governance','example-maintenance','example-onboarding',
  'example-communications','example-developer-standards','example-learning'
]);
const VERSION=1;

export function migrateCatalogue(catalogue){
  if(!catalogue)catalogue=seedCatalogue();
  if((catalogue.officialResourcesVersion??0)>=VERSION)return catalogue;
  const groups=catalogueDepartments(catalogue);
  const knownIds=new Set([...catalogue.items,...catalogue.deleted.map(entry=>entry.resource)].map(resource=>resource.id));
  for(const resource of resources){
    if(!additions.has(resource.id)||knownIds.has(resource.id))continue;
    // Respect local department removal; never introduce an invisible orphan or
    // replace a team's renamed/reordered departments with the default groups.
    if(!groups.some(group=>group.id===resource.department))continue;
    catalogue.items.push(structuredClone(resource));
    knownIds.add(resource.id);
  }
  catalogue.officialResourcesVersion=VERSION;
  return catalogue;
}
