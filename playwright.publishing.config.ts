import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:"./tests/publishing",workers:1,timeout:60000,
  use:{baseURL:"http://127.0.0.1:3001",trace:"retain-on-failure",launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}},
  projects:[{name:"desktop",use:{...devices["Desktop Chrome"]}},{name:"mobile",use:{...devices["iPhone 13"],viewport:{width:360,height:800},defaultBrowserType:"chromium"}}],
  webServer:[
    {command:"node tests/fixtures/publishing-backend.mjs",url:"http://127.0.0.1:55431/__health",reuseExistingServer:false},
    {command:"npm run dev -- --port 3001",url:"http://127.0.0.1:3001",reuseExistingServer:false,env:{NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:55431",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"fixture-publishable",SUPABASE_SECRET_KEY:"fixture-server-only",NEXT_PUBLIC_SITE_URL:"http://127.0.0.1:3001",ARK_TEST_DIST_DIR:".next-publishing-tests",GITHUB_IMPORT_CLIENT_ID:"fixture-client",GITHUB_IMPORT_CLIENT_SECRET:"fixture-secret",GITHUB_IMPORT_APP_SLUG:"ark-fixture-import",GITHUB_IMPORT_COOKIE_KEY:"AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE="}},
  ],
});
