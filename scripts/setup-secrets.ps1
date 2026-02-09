# Setup Cloudflare Secrets
$projectName = "sitematiere-nexjs"
$secrets = @{
    "DATABASE_URL" = "postgresql://neondb_owner:Gorkamorka1964%21@ep-lingering-tooth-ag7etugz-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    "NEXTAUTH_SECRET" = "OqrHYZSq3QNnm5nOGtFWDj5h5wjRvdFEm+yPFgazySY="
    "R2_SECRET_ACCESS_KEY" = "1d158f4a3427103ec6683c29f03100a477cbf427db0f2e7d135db20a9a51dbb9"
}

foreach ($key in $secrets.Keys) {
    Write-Host "Setting secret: $key for project $projectName..."
    $value = $secrets[$key]
    # We use echo to pipe the value into the command to handle the interactive prompt
    echo $value | npx wrangler pages secret put $key --project-name $projectName
}

Write-Host "Secrets setup complete!"
