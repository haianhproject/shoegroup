$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$taskTools = Join-Path $taskRoot 'tools/.cache'
$taskVersion = '3.9.11'
$taskMaven = Join-Path $taskTools "apache-maven-$taskVersion/bin/mvn.cmd"
if (!(Test-Path -LiteralPath $taskMaven)) {
    New-Item -ItemType Directory -Path $taskTools -Force | Out-Null
    $taskArchive = Join-Path $taskTools "apache-maven-$taskVersion-bin.zip"
    $taskUrl = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$taskVersion/apache-maven-$taskVersion-bin.zip"
    Invoke-WebRequest -Uri $taskUrl -OutFile $taskArchive
    $taskExpected = ((Invoke-WebRequest -Uri "$taskUrl.sha512").Content.Trim() -split '\s+')[0]
    $taskHasher = [System.Security.Cryptography.SHA512]::Create()
    try { $taskActual = [BitConverter]::ToString($taskHasher.ComputeHash([System.IO.File]::ReadAllBytes($taskArchive))).Replace('-', '') }
    finally { $taskHasher.Dispose() }
    if ($taskActual -ine $taskExpected) { throw 'Maven archive checksum mismatch.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($taskArchive, $taskTools)
}
if (!$env:JAVA_HOME) {
    $taskJavac = Get-Command javac -ErrorAction SilentlyContinue
    if ($taskJavac) { $env:JAVA_HOME = Split-Path -Parent (Split-Path -Parent $taskJavac.Source) }
    if (Test-Path -LiteralPath 'C:/Program Files/Java/jdk-21/bin/javac.exe') {
        $env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
    }
}
if (!(Test-Path -LiteralPath "$env:JAVA_HOME/bin/javac.exe")) { throw 'Set JAVA_HOME to a JDK 17 or newer.' }
& $taskMaven '-f' (Join-Path (Split-Path -Parent $PSScriptRoot) 'pom.xml') @args
exit $LASTEXITCODE
