import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, KeyRound } from "lucide-react";
import { SHOP_TOOLS, findTool, sellableShopTools } from "@/lib/tool-shop-catalog";
import { useToolLicense, setStoredLicenseCode } from "@/hooks/useToolLicense";

export default function ToolsShopRedeemPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [code, setCode] = useState(sp.get("code") || "");
  const [redeemed, setRedeemed] = useState<{ plan: string; tool_ids: string[]; code: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { redeem } = useToolLicense("_bootstrap");

  const doRedeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await redeem(code.trim());
      if (!res?.ok) { toast.error(res?.error || "Code not found"); return; }
      setStoredLicenseCode(res.code);
      setRedeemed({ plan: res.plan, tool_ids: res.tool_ids ?? [], code: res.code });
      toast.success("Unlocked. Your memory is now attached to this code.");
    } catch (e) {
      toast.error("Redemption failed");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (sp.get("code")) doRedeem();
    // eslint-disable-next-line
  }, []);

  const ownedTools = redeemed
    ? (redeemed.plan === "unlimited"
        ? sellableShopTools()
        : redeemed.tool_ids.map(findTool).filter(Boolean) as typeof SHOP_TOOLS)
    : [];

  return (
    <>
      <Helmet>
        <title>Redeem Your Tool Code — Leak Ecosystem</title>
        <meta name="description" content="Redeem your yearly tool access code and unlock your persistent AI memory." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="p-8 border-amber-500/40">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h1 className="text-2xl font-serif font-bold">Redeem your code</h1>
            </div>

            {!redeemed && (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Paste the code we emailed after checkout. It unlocks your tool(s) for life and re-attaches your saved memory on this device.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="code">License code</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="LEAK-XXXX-XXXX"
                      className="font-mono"
                    />
                  </div>
                  <Button
                    onClick={doRedeem}
                    disabled={busy || !code.trim()}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {busy ? "Checking..." : "Unlock"}
                  </Button>
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    Don't have one? <Link to="/tools-shop" className="underline text-amber-500">Browse the tools</Link>
                  </div>
                </div>
              </>
            )}

            {redeemed && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Code active: <span className="font-mono">{redeemed.code}</span></span>
                </div>
                <Badge className="mb-4">{redeemed.plan === "unlimited" ? "All-Access Vault" : redeemed.plan === "triple" ? "3-Tool Bundle" : "Single Tool"}</Badge>
                <p className="text-sm text-muted-foreground mb-4">
                  Your tools are unlocked below. Open one to run it — memory saves automatically to this code.
                </p>
                <div className="space-y-2">
                  {ownedTools.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-amber-500/40 transition">
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.tagline}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => nav(t.route)}>Open</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
