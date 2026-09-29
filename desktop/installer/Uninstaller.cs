using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace OryxgenAI.Uninstaller
{
    static class Program
    {
        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(int wEventId, int uFlags, IntPtr dwItem1, IntPtr dwItem2);

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isQuiet = false;
            foreach (var a in args)
            {
                if (a.Equals("/quiet", StringComparison.OrdinalIgnoreCase) || 
                    a.Equals("-quiet", StringComparison.OrdinalIgnoreCase) ||
                    a.Equals("/silent", StringComparison.OrdinalIgnoreCase))
                {
                    isQuiet = true;
                }
            }

            if (!isQuiet)
            {
                DialogResult dr = MessageBox.Show(
                    "Haqiqatan ham Oryxgen AI ilovasini kompyuteringizdan butunlay o'chirib tashlamoqchimisiz?",
                    "Oryxgen AI — O'chirish (Uninstall)",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question
                );
                if (dr != DialogResult.Yes) return;
            }

            try
            {
                // 1. Terminate running processes
                string[] procNames = new string[] { "OryxgenAI", "electron" };
                foreach (var procName in procNames)
                {
                    try
                    {
                        foreach (var p in Process.GetProcessesByName(procName))
                        {
                            try { p.Kill(); } catch { }
                        }
                    }
                    catch { }
                }

                Thread.Sleep(600);

                // 2. Remove Registry entries
                try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\oryxgen", false); } catch { }
                try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\OryxgenAI", false); } catch { }
                try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\App Paths\OryxgenAI.exe", false); } catch { }

                // 3. Remove Shortcuts
                try
                {
                    string programsDir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                        @"Microsoft\Windows\Start Menu\Programs"
                    );
                    string startMenuLnk = Path.Combine(programsDir, "Oryxgen AI.lnk");
                    if (File.Exists(startMenuLnk)) File.Delete(startMenuLnk);
                }
                catch { }

                try
                {
                    string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    string desktopLnk = Path.Combine(desktopDir, "Oryxgen AI.lnk");
                    if (File.Exists(desktopLnk)) File.Delete(desktopLnk);
                }
                catch { }

                // 4. Remove Roaming App Data
                try
                {
                    string roamingApp = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                        "oryxgen-ai-desktop"
                    );
                    if (Directory.Exists(roamingApp)) Directory.Delete(roamingApp, true);
                }
                catch { }

                // 5. Notify Windows Shell about association/icon changes
                try
                {
                    SHChangeNotify(0x08000000, 0, IntPtr.Zero, IntPtr.Zero); // SHCNE_ASSOCCHANGED
                }
                catch { }

                // 6. Spawn self-deleting batch script for the install directory
                string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                string scriptPath = Path.Combine(Path.GetTempPath(), "oryxgen_uninstall_cleanup.bat");
                string batContent = 
                    "@echo off\r\n" +
                    "timeout /t 2 /nobreak >nul\r\n" +
                    ":retry\r\n" +
                    "rmdir /s /q \"" + installDir + "\" >nul 2>&1\r\n" +
                    "if exist \"" + installDir + "\" (\r\n" +
                    "  timeout /t 1 /nobreak >nul\r\n" +
                    "  goto retry\r\n" +
                    ")\r\n" +
                    "del \"%~f0\" >nul 2>&1\r\n";

                File.WriteAllText(scriptPath, batContent);

                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c \"" + scriptPath + "\"")
                {
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                Process.Start(psi);

                if (!isQuiet)
                {
                    MessageBox.Show(
                        "Oryxgen AI kompyuteringizdan muvaffaqiyatli va to'liq o'chirildi.",
                        "Oryxgen AI",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
            }
            catch (Exception ex)
            {
                if (!isQuiet)
                {
                    MessageBox.Show("O'chirish jarayonida xatolik yuz berdi: " + ex.Message, "Oryxgen AI", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }
    }
}
