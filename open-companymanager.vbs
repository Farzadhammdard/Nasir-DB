' Runs the launcher without flashing a console window.
' Double-clicking the desktop shortcut targets this script.
Dim shell, projectDir
Set shell = CreateObject("WScript.Shell")
projectDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
shell.CurrentDirectory = projectDir
shell.Run "cmd /c """ & projectDir & "\open-companymanager.bat""", 0, False
Set shell = Nothing
