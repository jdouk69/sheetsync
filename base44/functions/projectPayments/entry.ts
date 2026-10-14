import {createClientFromRequest} from 'npm:@base44/sdk@0.8.21';
import {all} from '../../shared/fullBackup.js';
export async function handleProjectPayments(req,client){
 try{
  const user=await client.auth.me();if(!user)return Response.json({error:'Sign in first.'},{status:401});
  const {projectId}=await req.json();if(typeof projectId!=='string'||!projectId)throw Error('Choose a project.');
  const entities=client.asServiceRole.entities;const project=await entities.Project.get(projectId);
  if(!project)return Response.json({error:'Project not found.'},{status:404});
  const member=project.sharedWith?.find(item=>item.email===user.email);
  if(project.created_by!==user.email&&user.role!=='admin'&&!['viewer','editor','admin'].includes(member?.role))return Response.json({error:'Project access denied.'},{status:403});
  const expenses=await all(entities.Expense,{projectId:project.id});
  const ids=expenses.map(row=>row.id);const authorized=new Set(ids);const payments=[];
  for(let start=0;start<ids.length;start+=100){
   const rows=await all(entities.Payment,{expenseId:{$in:ids.slice(start,start+100)}});
   // The server filters again before returning anything to the visitor.
   for(const row of rows)if(authorized.has(row.expenseId))payments.push(row);
  }
  return Response.json({payments:[...new Map(payments.map(row=>[row.id,row])).values()]});
 }catch(error){return Response.json({error:error.message||'Could not load project payments.'},{status:400});}
}
Deno.serve(req=>handleProjectPayments(req,createClientFromRequest(req)));
