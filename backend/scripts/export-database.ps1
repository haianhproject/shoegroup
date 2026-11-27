# Muc dich: Sao luu DB va xuat SQL day du cau truc/du lieu de ca nhom cai lai.
param([string]$Date = (Get-Date -Format 'yyyyMMdd'))
$ErrorActionPreference = 'Stop'
if ($Date -notmatch '^\d{8}$') { throw 'Ngay xuat phai co dang yyyyMMdd.' }
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Push-Location $root
$snapshotName = 'ShoegroupExportSnapshot_' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + '_' + $PID
$snapshotCreated = $false
$temporaryOutput = $null
try {
    $config = (& node -e "process.stdout.write(JSON.stringify(require('./backend/legacy-express/src/security/env').db))") | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Khong doc duoc cau hinh database.' }
    foreach ($assembly in @('ConnectionInfo', 'Smo', 'SmoExtended')) {
        [Reflection.Assembly]::Load("Microsoft.SqlServer.$assembly, Version=16.0.0.0, Culture=neutral, PublicKeyToken=89845dcd8080cc91") | Out-Null
    }
    $hostName = $config.server
    if ($config.options.instanceName) { $hostName += '\' + $config.options.instanceName }
    elseif ($config.port) { $hostName += ',' + $config.port }
    $connection = New-Object Microsoft.SqlServer.Management.Common.ServerConnection
    $connection.ServerInstance = $hostName
    $connection.LoginSecure = $false
    $connection.Login = $config.user
    $connection.Password = $config.password
    $connection.StatementTimeout = 600
    $server = New-Object Microsoft.SqlServer.Management.Smo.Server($connection)
    $db = $server.Databases[$config.database]
    if ($null -eq $db) { throw 'Khong tim thay database nguon.' }
    $name = '[' + $db.Name.Replace(']', ']]') + ']'
    $literal = "N'" + $db.Name.Replace("'", "''") + "'"
    $backup = Join-Path $server.BackupDirectory ($db.Name + '_FULL_' + $Date + '_' + (Get-Date -Format 'HHmmss') + '.bak')
    $backupLiteral = "N'" + $backup.Replace("'", "''") + "'"
    $connection.ExecuteNonQuery("BACKUP DATABASE $name TO DISK=$backupLiteral WITH COPY_ONLY,INIT,CHECKSUM; RESTORE VERIFYONLY FROM DISK=$backupLiteral WITH CHECKSUM;") | Out-Null
    Write-Host "Backup verified: $backup"

    # Export one point-in-time copy so active sales cannot change rows between tables.
    $snapshotQuoted = '[' + $snapshotName + ']'
    $snapshotLiteral = "N'" + $snapshotName + "'"
    $exists = $connection.ExecuteWithResults("SELECT DB_ID($snapshotLiteral) AS ExistingID").Tables[0].Rows[0].ExistingID
    if ($exists -isnot [DBNull] -and $null -ne $exists) { throw 'Export snapshot already exists.' }
    $paths = $connection.ExecuteWithResults("SELECT CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultDataPath')) AS DataPath,CONVERT(nvarchar(4000),SERVERPROPERTY('InstanceDefaultLogPath')) AS LogPath").Tables[0].Rows[0]
    $dataDirectory = [string]$paths.DataPath
    $logDirectory = [string]$paths.LogPath
    if (-not $dataDirectory) { $dataDirectory = [IO.Path]::GetDirectoryName($db.FileGroups[0].Files[0].FileName) }
    if (-not $logDirectory) { $logDirectory = [IO.Path]::GetDirectoryName($db.LogFiles[0].FileName) }
    if (-not [IO.Path]::IsPathRooted($dataDirectory) -or -not [IO.Path]::IsPathRooted($logDirectory)) { throw 'SQL Server data directories are unavailable.' }
    $fileList = $connection.ExecuteWithResults("RESTORE FILELISTONLY FROM DISK=$backupLiteral").Tables[0]
    $moves = @()
    $fileNumber = 0
    foreach ($file in $fileList.Rows) {
        $fileNumber++
        if ($file.Type -notin @('D','L')) { throw 'Unsupported SQL backup file type.' }
        $directory = if ($file.Type -eq 'L') { $logDirectory } else { $dataDirectory }
        $extension = if ($file.Type -eq 'L') { '.ldf' } elseif ($fileNumber -eq 1) { '.mdf' } else { '.ndf' }
        $physicalPath = Join-Path $directory ($snapshotName + '_' + $fileNumber + $extension)
        $logicalLiteral = "N'" + ([string]$file.LogicalName).Replace("'", "''") + "'"
        $physicalLiteral = "N'" + $physicalPath.Replace("'", "''") + "'"
        $moves += "MOVE $logicalLiteral TO $physicalLiteral"
    }
    $connection.ExecuteNonQuery("RESTORE DATABASE $snapshotQuoted FROM DISK=$backupLiteral WITH " + ($moves -join ',') + ',RECOVERY;') | Out-Null
    $snapshotCreated = $true
    $connection.ExecuteNonQuery("ALTER DATABASE $snapshotQuoted SET READ_ONLY WITH ROLLBACK IMMEDIATE;") | Out-Null
    $server.Databases.Refresh()
    $exportDb = $server.Databases[$snapshotName]
    $transfer = New-Object Microsoft.SqlServer.Management.Smo.Transfer($exportDb)
    $transfer.CopyAllObjects = $true
    $transfer.CopyAllLogins = $false
    $transfer.CopyAllUsers = $false
    $transfer.CopyAllRoles = $false
    $transfer.CopyAllDatabaseScopedCredentials = $false
    $transfer.CreateTargetDatabase = $false
    $transfer.Options.ScriptSchema = $true
    $transfer.Options.ScriptData = $true
    $transfer.Options.IncludeDatabaseContext = $false
    $transfer.Options.WithDependencies = $true
    $transfer.Options.DriAll = $true
    $transfer.Options.DriIncludeSystemNames = $true
    $transfer.Options.Indexes = $true
    $transfer.Options.Triggers = $true
    $transfer.Options.ExtendedProperties = $true
    $transfer.Options.AllowSystemObjects = $true
    $transfer.Options.ScriptBatchTerminator = $true
    $transfer.Options.ContinueScriptingOnError = $false
    $transfer.Options.TargetServerVersion = [Microsoft.SqlServer.Management.Smo.SqlServerVersion]::Version160
    # SSMS diagram support is stored in this DB but excluded by CopyAllObjects.
    $diagramTable = $exportDb.Tables.Item('sysdiagrams', 'dbo')
    if ($diagramTable) { $transfer.ObjectList.Add($diagramTable) | Out-Null }
    $diagramFunction = $exportDb.UserDefinedFunctions.Item('fn_diagramobjects', 'dbo')
    if ($diagramFunction) { $transfer.ObjectList.Add($diagramFunction) | Out-Null }
    foreach ($procedure in $exportDb.StoredProcedures) {
        if ($procedure.Schema -eq 'dbo' -and $procedure.Name -match '^sp_(alterdiagram|creatediagram|dropdiagram|helpdiagramdefinition|helpdiagrams|renamediagram|upgraddiagrams)$') {
            $transfer.ObjectList.Add($procedure) | Out-Null
        }
    }
    $header = @"
-- Muc dich: Ban DB FULL ngay $Date, xuat tu ban sao nhat quan cua SQL Server dang dung.
-- CANH BAO: Chay file nay se XOA toan bo database $name cu va tao lai.
-- Dung Spring/Vue, sao luu DB rieng cua ban truoc khi chay trong SSMS (F5).
-- Co du lieu tai khoan va don hang; chi chia se trong nhom duoc phep.
-- Khong chua mat khau ket noi SQL/JWT/SMTP trong .env.
USE [master]
GO
IF DB_ID($literal) IS NOT NULL
BEGIN
    ALTER DATABASE $name SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE $name;
END
GO
CREATE DATABASE $name COLLATE $($db.Collation)
GO
USE $name
GO
SET XACT_ABORT ON
GO
"@
    $output = Join-Path $root ('database/' + $db.Name + '_FULL_' + $Date + '.sql')
    $temporaryOutput = $output + '.' + $snapshotName + '.tmp'
    $databaseDirectory = [IO.Path]::GetFullPath((Join-Path $root 'database')) + [IO.Path]::DirectorySeparatorChar
    if (-not [IO.Path]::GetFullPath($output).StartsWith($databaseDirectory,[StringComparison]::OrdinalIgnoreCase) -or -not [IO.Path]::GetFullPath($temporaryOutput).StartsWith($databaseDirectory,[StringComparison]::OrdinalIgnoreCase)) { throw 'Export path must stay inside the workspace database directory.' }
    $writer = New-Object IO.StreamWriter($temporaryOutput, $false, (New-Object Text.UTF8Encoding($true)))
    try {
        $writer.WriteLine($header)
        foreach ($batch in $transfer.EnumScriptTransfer()) {
            $writer.WriteLine($batch)
            $writer.WriteLine('GO')
        }
        # Restore identity counters even when recently deleted IDs exceed the largest row.
        $identities = $exportDb.ExecuteWithResults('SELECT SCHEMA_NAME(t.schema_id) AS s,t.name AS t,CONVERT(varchar(40),c.last_value) AS v FROM sys.identity_columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.is_ms_shipped=0 AND c.last_value IS NOT NULL').Tables[0]
        foreach ($identity in $identities.Rows) {
            $table = '[' + $identity.s.Replace(']', ']]') + '].[' + $identity.t.Replace(']', ']]') + ']'
            $tableLiteral = "N'" + $table.Replace("'", "''") + "'"
            $writer.WriteLine("DBCC CHECKIDENT ($tableLiteral, RESEED, $($identity.v)) WITH NO_INFOMSGS;")
            $writer.WriteLine('GO')
        }
        $writer.WriteLine("DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;")
        $writer.WriteLine('GO')
    } finally { $writer.Dispose() }
    & node (Join-Path $PSScriptRoot 'verify-database-export.cjs') $temporaryOutput --source $snapshotName
    if ($LASTEXITCODE -ne 0) { throw 'Full SQL restore verification failed. The existing SQL export was not replaced.' }
    Move-Item -LiteralPath $temporaryOutput -Destination $output -Force
    $temporaryOutput = $null
    Write-Host "Full SQL: $output"
} finally {
    if ($snapshotCreated) {
        if ($snapshotName -notmatch '^ShoegroupExportSnapshot_\d+_\d+$') { throw 'Unsafe export snapshot name.' }
        $connection.ExecuteNonQuery("USE [master]; ALTER DATABASE [$snapshotName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$snapshotName];") | Out-Null
    }
    if ($temporaryOutput -and (Test-Path -LiteralPath $temporaryOutput -PathType Leaf)) { Remove-Item -LiteralPath $temporaryOutput }
    if ($connection) { $connection.Disconnect() }
    Pop-Location
}
