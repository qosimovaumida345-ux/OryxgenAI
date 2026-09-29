using System;
using System.IO;
using System.IO.Compression;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Diagnostics;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace OryxgenInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label statusLabel;
        private Label titleLabel;
        private Label subtitleLabel;
        private Button installButton;
        private PictureBox logoBox;
        private Panel headerPanel;
        private Label pathLabel;

        private readonly string installDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "OryxgenAI"
        );

        public InstallerForm()
        {
            this.Text = "Oryxgen AI — O'rnatish Dasturi";
            this.Size = new Size(520, 360);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(12, 12, 16);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Try load icon
            string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch {}
            }

            InitUi();
        }

        private void InitUi()
        {
            headerPanel = new Panel
            {
                Location = new Point(0, 0),
                Size = new Size(520, 110),
                BackColor = Color.FromArgb(18, 18, 24)
            };

            logoBox = new PictureBox
            {
                Location = new Point(24, 20),
                Size = new Size(70, 70),
                SizeMode = PictureBoxSizeMode.Zoom,
                BackColor = Color.Transparent
            };

            // Load Logo
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string logoPath = Path.Combine(baseDir, "dist", "Logo.png");
            if (!File.Exists(logoPath)) logoPath = Path.Combine(baseDir, "Logo.png");
            if (!File.Exists(logoPath)) logoPath = Path.Combine(baseDir, "..", "dist", "Logo.png");

            if (File.Exists(logoPath))
            {
                try { logoBox.Image = Image.FromFile(logoPath); } catch {}
            }

            titleLabel = new Label
            {
                Text = "Oryxgen AI Platform",
                Location = new Point(106, 26),
                AutoSize = true,
                Font = new Font("Segoe UI", 16f, FontStyle.Bold),
                ForeColor = Color.FromArgb(248, 250, 252)
            };

            subtitleLabel = new Label
            {
                Text = "Autonomous Desktop, CodeX & 200+ AI Models",
                Location = new Point(108, 62),
                AutoSize = true,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184)
            };

            headerPanel.Controls.Add(logoBox);
            headerPanel.Controls.Add(titleLabel);
            headerPanel.Controls.Add(subtitleLabel);

            pathLabel = new Label
            {
                Text = "O'rnatish manzili: " + installDir,
                Location = new Point(28, 130),
                Size = new Size(464, 24),
                ForeColor = Color.FromArgb(100, 116, 139),
                Font = new Font("Segoe UI", 8.5f)
            };

            statusLabel = new Label
            {
                Text = "O'rnatishni boshlash uchun quyidagi tugmani bosing.",
                Location = new Point(28, 165),
                Size = new Size(464, 25),
                ForeColor = Color.FromArgb(226, 232, 240)
            };

            progressBar = new ProgressBar
            {
                Location = new Point(28, 200),
                Size = new Size(464, 24),
                Style = ProgressBarStyle.Continuous,
                Value = 0
            };

            installButton = new Button
            {
                Text = "O'rnatish (Install)",
                Location = new Point(160, 250),
                Size = new Size(200, 42),
                FlatStyle = FlatStyle.Flat,
                BackColor = Color.FromArgb(14, 165, 233),
                ForeColor = Color.Black,
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            installButton.FlatAppearance.BorderSize = 0;
            installButton.Click += (s, e) => StartInstall();

            this.Controls.Add(headerPanel);
            this.Controls.Add(pathLabel);
            this.Controls.Add(statusLabel);
            this.Controls.Add(progressBar);
            this.Controls.Add(installButton);
        }

        private void StartInstall()
        {
            installButton.Enabled = false;
            installButton.Text = "O'rnatilmoqda...";
            progressBar.Style = ProgressBarStyle.Marquee;

            Thread worker = new Thread(DoInstall);
            worker.IsBackground = true;
            worker.Start();
        }

        private void DoInstall()
        {
            try
            {
                UpdateStatus("Eski jarayonlar tekshirilmoqda...", 10);
                foreach (var proc in Process.GetProcessesByName("OryxgenAI"))
                {
                    try { proc.Kill(); proc.WaitForExit(2000); } catch {}
                }

                UpdateStatus("O'rnatish katalogi tayyorlanmoqda...", 25);
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                }

                UpdateStatus("Ilova fayllari ko'chirilmoqda...", 40);
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string payloadPath = Path.Combine(baseDir, "payload.zip");
                if (!File.Exists(payloadPath)) payloadPath = Path.Combine(baseDir, "desktop", "payload.zip");

                // Check embedded resource if payload.zip not alongside
                if (!File.Exists(payloadPath))
                {
                    var asm = System.Reflection.Assembly.GetExecutingAssembly();
                    string resName = null;
                    foreach (var n in asm.GetManifestResourceNames())
                    {
                        if (n.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase))
                        {
                            resName = n;
                            break;
                        }
                    }

                    if (resName != null)
                    {
                        payloadPath = Path.Combine(Path.GetTempPath(), "oryxgen_payload_temp.zip");
                        using (var resStream = asm.GetManifestResourceStream(resName))
                        using (var fileStream = File.Create(payloadPath))
                        {
                            resStream.CopyTo(fileStream);
                        }
                    }
                }

                if (File.Exists(payloadPath))
                {
                    UpdateStatus("Fayllar arxivdan chiqarilmoqda...", 60);
                    using (ZipArchive archive = ZipFile.OpenRead(payloadPath))
                    {
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string destPath = Path.Combine(installDir, entry.FullName);
                            if (string.IsNullOrEmpty(entry.Name))
                            {
                                Directory.CreateDirectory(destPath);
                                continue;
                            }
                            Directory.CreateDirectory(Path.GetDirectoryName(destPath));
                            entry.ExtractToFile(destPath, true);
                        }
                    }
                }
                else
                {
                    // Fallback: Copy from local app-build if exists
                    string appBuildDir = Path.Combine(baseDir, "app-build");
                    if (!Directory.Exists(appBuildDir)) appBuildDir = Path.Combine(baseDir, "desktop", "app-build");
                    if (Directory.Exists(appBuildDir))
                    {
                        CopyDirectory(appBuildDir, installDir);
                    }
                    else
                    {
                        throw new FileNotFoundException("payload.zip yoki app-build papkasi topilmadi.");
                    }
                }

                UpdateStatus("Windows reestri va protokollari sozlanmoqda...", 80);
                string mainExe = Path.Combine(installDir, "OryxgenAI.exe");
                RegisterProtocol(mainExe);

                UpdateStatus("Start menyu yorlig'i yaratilmoqda...", 90);
                CreateStartMenuShortcut(mainExe);

                UpdateStatus("Muvaffaqiyatli o'rnatildi! Ilova ishga tushirilmoqda...", 100);
                Thread.Sleep(800);

                if (File.Exists(mainExe))
                {
                    Process.Start(new ProcessStartInfo(mainExe) { UseShellExecute = true });
                }

                this.Invoke((Action)(() => this.Close()));
            }
            catch (Exception ex)
            {
                this.Invoke((Action)(() =>
                {
                    progressBar.Style = ProgressBarStyle.Continuous;
                    progressBar.Value = 0;
                    installButton.Enabled = true;
                    installButton.Text = "Qaytadan urinish";
                    statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
                    statusLabel.Text = "Xatolik: " + ex.Message;
                    MessageBox.Show(ex.Message, "O'rnatishda xatolik", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }));
            }
        }

        private void CopyDirectory(string sourceDir, string targetDir)
        {
            foreach (string dir in Directory.GetDirectories(sourceDir, "*", SearchOption.AllDirectories))
            {
                Directory.CreateDirectory(dir.Replace(sourceDir, targetDir));
            }
            foreach (string file in Directory.GetFiles(sourceDir, "*.*", SearchOption.AllDirectories))
            {
                File.Copy(file, file.Replace(sourceDir, targetDir), true);
            }
        }

        private void RegisterProtocol(string exePath)
        {
            try
            {
                using (var key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\oryxgen"))
                {
                    key.SetValue("", "URL:Oryxgen Protocol");
                    key.SetValue("URL Protocol", "");
                    using (var iconKey = key.CreateSubKey("DefaultIcon"))
                    {
                        iconKey.SetValue("", "\"" + exePath + "\",0");
                    }
                    using (var cmdKey = key.CreateSubKey(@"shell\open\command"))
                    {
                        cmdKey.SetValue("", "\"" + exePath + "\" \"%1\"");
                    }
                }
            }
            catch {}
        }

        private void CreateStartMenuShortcut(string targetExe)
        {
            try
            {
                string programsDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    @"Microsoft\Windows\Start Menu\Programs"
                );
                string shortcutPath = Path.Combine(programsDir, "Oryxgen AI.lnk");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetExe;
                shortcut.WorkingDirectory = Path.GetDirectoryName(targetExe);
                shortcut.Description = "Oryxgen AI — Autonomous Desktop & CodeX Platform";
                shortcut.IconLocation = targetExe + ",0";
                shortcut.Save();
            }
            catch {}
        }

        private void UpdateStatus(string message, int progress)
        {
            if (this.IsDisposed) return;
            this.Invoke((Action)(() =>
            {
                statusLabel.Text = message;
                if (progressBar.Style == ProgressBarStyle.Continuous)
                {
                    progressBar.Value = Math.Min(100, Math.Max(0, progress));
                }
            }));
        }
    }
}
