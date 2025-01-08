import { User } from './user.model'; 

export interface UserSearchResults 
{ 
   users: User[]; 
   totalCount: number;
}