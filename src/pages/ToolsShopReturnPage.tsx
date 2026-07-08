import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function ToolsShopReturnPage() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  return (
    <>
      <Helmet><title>Payment received — Leak Tool Shop</title></Helmet>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <Card className="p-8 max-w-md text-center border-amber-500/40">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold mb-2">You're in.</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Your lifetime code is on its way to your inbox. It usually arrives within a minute. Once you have it, paste it on the redeem page to unlock your tool(s) and start building memory.
          </p>
          {sessionId && <p className="text-[10px] font-mono text-muted-foreground mb-4">ref: {sessionId.slice(0, 24)}…</p>}
          <div className="space-y-2">
            <Link to="/tools-shop/redeem"><Button className="w-full bg-amber-500 hover:bg-amber-600 text-black">Redeem my code</Button></Link>
            <Link to="/"><Button variant="outline" className="w-full">Back to home</Button></Link>
          </div>
        </Card>
      </div>
    </>
  );
}
