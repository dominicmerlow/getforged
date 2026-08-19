// Shared with app/claim/[token]/actions.ts — kept out of app/actions/auth.ts
// because a 'use server' file may only export async functions, and this is
// a plain string constant.
export const SIGNUPS_PAUSED_MSG =
  "New signups are paused right now. Please check back soon or email getforged@getbrian.xyz if you're locked out."
