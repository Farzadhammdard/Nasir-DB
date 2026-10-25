$ErrorActionPreference = 'Stop'

$outputDirectory = Join-Path $PSScriptRoot '..\release'
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$outputPath = Join-Path $outputDirectory 'NasirDB.exe'

$source = @'
using System;
using System.Diagnostics;
using System.Windows.Forms;

internal static class NasirDbLauncher
{
    [STAThread]
    private static void Main()
    {
        try
        {
            Process.Start(new ProcessStartInfo("https://nasir-db.vercel.app")
            {
                UseShellExecute = true
            });
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "Could not open the NasirDB website. Check your internet connection and try again.\n\n" + error.Message,
                "NasirDB",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}
'@

Add-Type `
    -TypeDefinition $source `
    -Language CSharp `
    -ReferencedAssemblies @('System.dll', 'System.Windows.Forms.dll') `
    -OutputAssembly $outputPath `
    -OutputType WindowsApplication

if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
    throw "Launcher executable was not created at $outputPath"
}

$executable = Get-Item -LiteralPath $outputPath
Write-Output "Created $($executable.FullName) ($([math]::Round($executable.Length / 1KB, 1)) KB)"
