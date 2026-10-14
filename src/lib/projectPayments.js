import {base44} from '@/api/base44Client';
export async function fetchProjectPayments(projectId){
 if(!projectId)return [];
 const result=await base44.functions.invoke('projectPayments',{projectId});
 if(result.data?.error||!Array.isArray(result.data?.payments))throw Error(result.data?.error||'Could not load project payments.');
 return result.data.payments;
}
