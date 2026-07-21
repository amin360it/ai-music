$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mp3s = Get-ChildItem -Path $ScriptDir -Recurse -Filter *.mp3 -File | Where-Object { $_.DirectoryName -notmatch '\\vendor\\|\\node_modules\\' } | Sort-Object Name
$tracks = [System.Collections.ArrayList]@()
foreach ($f in $mp3s) {
  $rel = ($f.FullName.Substring($ScriptDir.Length + 1) -replace '\\', '/')
  $id = $rel + '::' + $f.Length
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
  $url = './' + $rel
  [void]$tracks.Add(@{ id = $id; name = $name; url = $url })
}
$json = $tracks | ConvertTo-Json -Depth 3
$outPath = Join-Path $ScriptDir 'songs.json'
Set-Content -Path $outPath -Value $json -Encoding UTF8
Write-Host "Generated songs.json with $($mp3s.Count) tracks"
