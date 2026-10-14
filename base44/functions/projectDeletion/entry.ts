import {createClientFromRequest} from 'npm:@base44/sdk@0.8.21';
import {all} from '../../shared/fullBackup.js';

export async function handleProjectDeletion(req,client){
 try{
  const user=await client.auth.me();if(!user)return Response.json({error:'Sign in first.'},{status:401});
  const input=await req.json();if(typeof input.projectId!=='string'||!input.projectId)throw Error('Select a project.');
  const entities=client.asServiceRole.entities;const project=await entities.Project.get(input.projectId);
  if(!project)return Response.json({error:'Project not found.'},{status:404});
  const member=project.sharedWith?.find(item=>item.email===user.email);
  if(project.created_by!==user.email&&user.role!=='admin'&&member?.role!=='admin')return Response.json({error:'Only a project owner or administrator can delete this project.'},{status:403});
  if(input.action==='preview'){
   const [expenses,budgets,budgetExpenses,snapshots,payments]=await Promise.all([
    all(entities.Expense,{projectId:project.id}),all(entities.Budget,{projectId:project.id}),all(entities.BudgetExpense,{projectId:project.id}),all(entities.ProjectSnapshot,{projectId:project.id}),all(entities.Payment,{})]);
   const expenseIds=new Set(expenses.map(row=>row.id));
   return Response.json({id:project.id,name:project.name,deletionMode:'project_record_only',expenses:expenses.length,recentlyDeletedExpenses:expenses.filter(row=>row.isDeleted).length,payments:payments.filter(row=>expenseIds.has(row.expenseId)).length,budgets:budgets.length,budgetExpenses:budgetExpenses.length,snapshots:snapshots.length});
  }
  if(input.action!=='delete')throw Error('Unknown operation.');
  if(typeof input.confirmProjectName!=='string'||input.confirmProjectName!==project.name)throw Error('Type the exact project name to confirm permanent deletion.');
  // Preserve Base44's original behavior. Do not introduce a cascade across
  // independently stored expense, payment, budget or snapshot collections.
  await entities.Project.delete(project.id);
  return Response.json({success:true,id:project.id,deletionMode:'project_record_only'});
 }catch(error){return Response.json({error:error.message||'Project deletion failed.'},{status:400});}
}
Deno.serve(req=>handleProjectDeletion(req,createClientFromRequest(req)));
