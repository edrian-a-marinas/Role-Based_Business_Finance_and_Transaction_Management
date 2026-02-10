async def get_logged_in_user_id():
  """
  example of sql lines taking the user id of the logged in
  Where blah blah blah
  """
  #the emulation user_id_logged in as ADMIN
  user_id_of_logged_in = 1   # for reability only so this is the exaclt outpu of JWT / loggei n id
  return user_id_of_logged_in


async def get_user_role(current_user_id):  
  """
    if not current_user_id:
      return None

    pool = await get_pool()
    async with pool.acquire() as conn:
      row = await conn.fetchrow(
        
        SELECT r.name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
        ,
        current_user_id
      )
      return row["name"] if row else None
  """

  # the emulation for role as admin
  current_user_id = 'admin'       # place holder for admin example. can change to standard 
  fetched_role = current_user_id

  return fetched_role