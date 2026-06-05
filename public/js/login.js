import { supabase } from './auth.js'

const form = document.getElementById('loginForm')

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  console.log('Login form submitted');

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  console.log('Email:', email);

  try {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log('Supabase response:', { error, data });

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = '/'
  } catch (err) {
    console.error('Unexpected error:', err);
    alert('Unexpected error: ' + err.message)
  }
})
