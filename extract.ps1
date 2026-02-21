$content = [System.IO.File]::ReadAllText("./index.html")

$styleMatch = [regex]::Match($content, "(?s)<style>(.*?)</style>")
if ($styleMatch.Success) {
    [System.IO.File]::WriteAllText("./styles.css", $styleMatch.Groups[1].Value.Trim())
    $content = $content.Replace($styleMatch.Value, '<link rel="stylesheet" href="styles.css">')
    Write-Host "Extracted styles.css"
}

$scriptMatch = [regex]::Match($content, "(?s)<script>\s*(const firebaseConfig.*?)</script>")
if ($scriptMatch.Success) {
    [System.IO.File]::WriteAllText("./app.js", $scriptMatch.Groups[1].Value.Trim())
    $content = $content.Replace($scriptMatch.Value, '<script src="app.js"></script>')
    Write-Host "Extracted app.js"
}

[System.IO.File]::WriteAllText("./index.html", $content)
Write-Host "Updated index.html"
