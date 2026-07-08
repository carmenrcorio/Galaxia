export async function GET() {
  const payload = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: process.env.ANDROID_PACKAGE_NAME ?? "com.galaxia.app",
        sha256_cert_fingerprints: (process.env.ANDROID_SHA256_FINGERPRINTS ?? "").split(",").filter(Boolean)
      }
    }
  ];
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" }
  });
}
