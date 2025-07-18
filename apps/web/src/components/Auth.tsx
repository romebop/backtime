import React, { useEffect } from 'react';

const Auth: React.FC = () => {
  useEffect(() => {
    // @ts-ignore
    google.accounts.id.initialize({
      client_id: "YOUR_GOOGLE_CLIENT_ID", // replace with your actual client id
      callback: handleCredentialResponse,
    });
    // @ts-ignore
    google.accounts.id.renderButton(
      document.getElementById("google-signin-button"),
      { theme: "outline", size: "large" }
    );
  }, []);

  const handleCredentialResponse = async (response: any) => {
    console.log("encoded jwt id token: " + response.credential);
    // send the id token to your backend
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log('authentication successful:', data);
        // store the jwt and user info
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // redirect or update ui
      } else {
        console.error('authentication failed:', data);
      }
    } catch (error) {
      console.error('error sending token to backend:', error);
    }
  };

  return (
    <div>
      <h2>sign in</h2>
      <div id="google-signin-button"></div>
    </div>
  );
};

export default Auth;
