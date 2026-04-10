1. git clone https://github.com/ieqisg/fortis-nexus
2. cd fortis-nexus 
3. git checkout -b develop (git branch --show-current branch, if main branch switch to develop)

#before making changes 
1. git checkout main (make sure na nasa main branch)
2. git pull origin main 

#after making changes
1. git --show-current branch (make sure it's develop brach)
2. git add . (or git add <filename>)
3. git commit -m "Message" 
3. git push