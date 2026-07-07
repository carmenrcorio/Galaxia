export async function GET() {
  const payload = {
    applinks: {
      apps: [],
      details: [
        {
          appID: process.env.IOS_APP_ID ?? "TEAMID.com.galaxia.app",
          paths: ["/account", "/account/*", "/invite/*", "/r/*"]
        }
      ]
    }
  };
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" }
  });
}
