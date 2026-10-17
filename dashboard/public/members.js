import {record,requireRole} from './model.js';

export const MEMBER_ROLES=['admin','contributor'];
const seedMembers=()=>[
  {id:'maya',name:'Maya Chen',role:'admin',onboarded:false},
  {id:'alex',name:'Alex Morgan',role:'contributor',onboarded:false},
  {id:'jo',name:'Jo Ellis',role:'contributor',onboarded:false}
];
export function currentMember(s){return s.members?.find(m=>m.id===s.activeMemberId);}
export function ensureMembers(s){
  if(!Array.isArray(s.members)||!s.members.length){
    s.members=seedMembers();
    s.activeMemberId=s.role==='contributor'?'alex':'maya';
    if(s.onboarded)s.members.find(m=>m.id==='alex').onboarded=true;
  }
  if(!currentMember(s))s.activeMemberId=s.members[0].id;
  const member=currentMember(s);s.role=member.role;s.onboarded=!!member.onboarded;
  return s.members;
}
export function selectMember(s,id){
  const member=s.members?.find(m=>m.id===id);
  if(!member)throw Error('This member no longer exists.');
  s.activeMemberId=id;s.role=member.role;s.onboarded=!!member.onboarded;
  return member;
}
export function setMemberRole(s,id,role){
  requireRole(s,['admin']);
  if(!MEMBER_ROLES.includes(role))throw Error('Choose Admin or Contributor.');
  const member=s.members?.find(m=>m.id===id);
  if(!member)throw Error('This member no longer exists.');
  if(member.role===role)return false;
  if(member.role==='admin'&&role!=='admin'&&s.members.filter(m=>m.role==='admin').length===1)throw Error('Keep at least one Admin. Make another member an Admin first.');
  const previous=member.role;
  const event=record(s,'Changed '+member.name+'’s role from '+roleLabel(previous)+' to '+roleLabel(role),id);
  event.kind='Role change';event.change={memberId:id,from:previous,to:role};
  member.role=role;
  if(s.activeMemberId===id)s.role=role;
  return true;
}
export const roleLabel=role=>role==='admin'?'Admin':'Contributor';
