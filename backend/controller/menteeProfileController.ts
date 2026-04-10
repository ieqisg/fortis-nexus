

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://arztiouvmvuhdtclodoo.supabase.co',
  'sb_publishable_Y3BP_zVKXp8iVeIaGKfIag_G96eNn7p'
)

const { data: { user } } = await supabase.auth.getUser() 
console.log(user)


// const { data, error } = await supabase
//     .from("MENTEE_GROUPS")
//     .insert