import { PricingTable, SignInButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Button, LandingTemplate } from '@leanlog/ui';

export default function LandingPage() {
  return (
    <>
      <SignedIn>
        <Navigate to="/track" replace />
      </SignedIn>
      <SignedOut>
        <LandingTemplate
          appName="LeanLog"
          iconSrc="/icon-192.png"
          // Slot prop: template renders this node in a named region (intentional composition).
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          cta={
            <SignInButton mode="modal">
              <Button fullWidth className="md:w-auto">
                Sign in / Sign up
              </Button>
            </SignInButton>
          }
          // react-doctor-disable-next-line react-doctor/jsx-no-jsx-as-prop
          pricing={<PricingTable />}
        />
      </SignedOut>
    </>
  );
}
