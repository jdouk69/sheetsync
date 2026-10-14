import React,{useState} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
async function call(action,data){const result=await base44.functions.invoke("projectDeletion",{action,...data});if(result.data?.error)throw Error(result.data.error);return result.data;}
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useLanguage} from './LanguageContext';
import {toast} from 'sonner';

export default function DeleteProjectDialog({project,onClose}){
 const {language}=useLanguage();const el=language==='el';const [typed,setTyped]=useState('');const client=useQueryClient();
 const {data:preview,isLoading,isFetching,isError,refetch}=useQuery({queryKey:['projectDeletionPreview',project.id],queryFn:()=>call("preview",{projectId:project.id}),staleTime:0});
 const deletion=useMutation({mutationFn:()=>call("delete",{projectId:project.id,confirmProjectName:typed}),onSuccess:async()=>{onClose();client.removeQueries({queryKey:['projectDeletionPreview',project.id]});await client.invalidateQueries();toast.success(el?'Το έργο διαγράφηκε οριστικά.':'Project permanently deleted.');}});
 const labels=el?{expenses:'Δαπάνες',payments:'Πληρωμές',budgets:'Προϋπολογισμοί',budgetExpenses:'Εγγραφές προϋπολογισμού',snapshots:'Στιγμιότυπα έργου'}:{expenses:'Expenses',payments:'Payments',budgets:'Budgets',budgetExpenses:'Budget entries',snapshots:'Project snapshots'};
 return <Dialog open onOpenChange={open=>{if(!open&&!deletion.isPending)onClose();}}>
  <DialogContent className="w-[92vw] sm:w-full max-w-lg max-h-[85dvh] overflow-y-auto">
   <DialogHeader><DialogTitle>{el?'Οριστική διαγραφή έργου':'Permanently delete project'}</DialogTitle></DialogHeader>
   <p className="font-semibold break-words">{preview?.name||project.name}</p>
   <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 space-y-2">
    <p>{el?'Θα διαγραφούν οριστικά το έργο και η πρόσβαση κοινής χρήσης. Οι σχετικές δαπάνες, πληρωμές, προϋπολογισμοί και στιγμιότυπα διατηρούν το παλιό αναγνωριστικό έργου και μπορεί να μην είναι προσβάσιμα.':'This permanently deletes the project record and its sharing access. Related expenses, payments, budgets, and snapshots keep their existing project ID and may become inaccessible.'}</p>
    <p className="font-semibold">{el?'Το έργο δεν μεταφέρεται στα Πρόσφατα Διαγραμμένα. Δεν υπάρχει αναίρεση.':'The project does not go to Recently Deleted. There is no undo.'}</p>
   </div>
   {isLoading?<p role="status">{el?'Έλεγχος συνδεδεμένων εγγραφών…':'Checking related records…'}</p>:isError?<div role="alert"><p>{el?'Δεν ήταν δυνατός ο έλεγχος. Δοκιμάστε ξανά.':'Could not check the related records. Try again.'}</p><Button variant="outline" onClick={()=>refetch()}>{el?'Επανάληψη':'Retry'}</Button></div>:<ul className="text-sm space-y-1">{Object.entries(labels).map(([key,label])=><li key={key}>{label}: <strong>{preview[key]}</strong></li>)}{preview.recentlyDeletedExpenses>0&&<li>{el?'Οι παραπάνω δαπάνες περιλαμβάνουν':'Expenses above include'} {preview.recentlyDeletedExpenses} {el?'στα Πρόσφατα Διαγραμμένα.':'in Recently Deleted.'}</li>}</ul>}
   <p className="text-sm text-slate-600">{el?'Κατεβάστε πρώτα ένα πλήρες αντίγραφο ZIP από Διαχείριση → Αντίγραφα & Επαναφορά, αν θέλετε αντίγραφο ασφαλείας.':'Download a complete ZIP from Admin → Backup & Restore first if you want a recovery copy.'}</p>
   <label className="text-sm font-medium" htmlFor="confirm-project-deletion">{el?'Πληκτρολογήστε ακριβώς το όνομα του έργου για επιβεβαίωση:':'Type the exact project name to confirm:'}</label>
   <Input id="confirm-project-deletion" value={typed} onChange={event=>setTyped(event.target.value)} autoComplete="off" disabled={deletion.isPending} />
   {deletion.isError&&<p role="alert" className="text-sm text-red-700">{deletion.error.message}</p>}
   <DialogFooter><Button variant="outline" disabled={deletion.isPending} onClick={onClose}>{el?'Ακύρωση':'Cancel'}</Button><Button variant="destructive" disabled={isLoading||isFetching||isError||!preview||typed!==preview.name||deletion.isPending} onClick={()=>deletion.mutate()}>{deletion.isPending?(el?'Διαγραφή…':'Deleting…'):(el?'Οριστική διαγραφή':'Delete permanently')}</Button></DialogFooter>
  </DialogContent>
 </Dialog>;
}
