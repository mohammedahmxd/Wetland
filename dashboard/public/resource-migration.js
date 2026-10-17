import {v5Defaults} from './resource-catalogue-v5.js';
import {CATALOGUE_VERSION,resources,seedCatalogue} from './resource-catalogue.js';

// Seed revisions describe the default library, not an instruction to replace a
// team's browser-local records. Explicit reset is the only destructive path.
export function ensureCatalogue(existing){
  if(existing==null)return seedCatalogue();
  if(!Array.isArray(existing.items)||!Array.isArray(existing.deleted)){
    throw new Error('The saved library has an unsupported format. Export the browser session before resetting it.');
  }
  if(existing.departments==null){
    // Early saves had no department array. Recover groups from both active and
    // deleted entries so existing records remain visible and restorable.
    const legacyTitles={fundraising:'Fundraising & donor relations',it:'IT, infrastructure & systems',support:'Supporter care & community',brand:'Brand, communications & media',live:'Ready to use',examples:'Demonstration examples'};
    const ids=[...new Set([...existing.items,...existing.deleted.map(entry=>entry.resource)].map(resource=>resource.department).filter(Boolean))];
    existing.departments=ids.map((id,index)=>({id,number:String(index+1).padStart(2,'0'),title:legacyTitles[id]||id,description:''}));
  }
  // Only replace fields that still match the shipped v5 default. Local edits,
  // trash, custom entries and the earlier department layouts remain untouched.
  if(existing.version===5&&CATALOGUE_VERSION>=6){
    for(const saved of existing.items){
      const previous=v5Defaults.find(item=>item.id===saved.id);
      const current=resources.find(item=>item.id===saved.id);
      if(!previous||!current)continue;
      for(const key of Object.keys(current)){
        if(key==='id'||key==='department')continue;
        if(JSON.stringify(saved[key])===JSON.stringify(previous[key]))saved[key]=structuredClone(current[key]);
      }
    }
  }
  // Do not downgrade state written by a newer application.
  if(existing.version==null||existing.version<CATALOGUE_VERSION)existing.version=CATALOGUE_VERSION;
  return existing;
}
