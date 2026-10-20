import { Card, CardContent } from '@/components/ui/card';

// Unsubscribe is fully managed by Lovable's email delivery: every email footer
// links to a Lovable-hosted unsubscribe page. This page is informational only.
const UnsubscribePage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Email Preferences</h1>
          <p className="text-muted-foreground">
            To unsubscribe from our emails, use the unsubscribe link in the footer of any
            email we've sent you. It takes effect immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
