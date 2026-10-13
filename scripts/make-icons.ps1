# 应用图标生成脚本：绘制蓝色渐变背景 + 白色键盘键帽（字母 A）
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$pub = Join-Path $root 'public'
$res = Join-Path $root 'build-res'
New-Item -ItemType Directory -Force -Path $pub, $res | Out-Null

function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-Icon([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # 蓝色渐变圆角背景
  $bgPath = New-RoundRect 0 0 $size $size ($size * 0.22)
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $c1 = [System.Drawing.Color]::FromArgb(0x25, 0x63, 0xEB)
  $c2 = [System.Drawing.Color]::FromArgb(0x3B, 0x82, 0xF6)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45)
  $g.FillPath($brush, $bgPath)

  # 白色键帽（居中 54% 大小）
  $kx = $size * 0.23; $ky = $size * 0.23; $kw = $size * 0.54; $kh = $size * 0.54
  $keyPath = New-RoundRect $kx $ky $kw $kh ($size * 0.09)
  $shadow = [System.Drawing.Color]::FromArgb(40, 0, 0, 0)
  $shadowBrush = New-Object System.Drawing.SolidBrush($shadow)
  $g.TranslateTransform($size * 0.012, $size * 0.015)
  $g.FillPath($shadowBrush, $keyPath)
  $g.ResetTransform()
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillPath($whiteBrush, $keyPath)

  # 键帽上的字母 A（深蓝）
  $font = New-Object System.Drawing.Font('Segoe UI', [float]($size * 0.30), [System.Drawing.FontStyle]::Bold)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x1D, 0x4E, 0xD8))
  $textRect = New-Object System.Drawing.RectangleF($kx, $ky, $kw, $kh)
  $g.DrawString('A', $font, $textBrush, $textRect, $fmt)

  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "saved $outPath ($size x $size)"
}

# PWA 图标与安卓 mipmap 各密度
New-Icon 512 (Join-Path $pub 'icon-512.png')
New-Icon 192 (Join-Path $pub 'icon-192.png')
foreach ($s in 48, 72, 96, 144, 192, 256) {
  New-Icon $s (Join-Path $res "icon-$s.png")
}

# 安卓自适应图标前景层：透明背景 + 居中键帽（落在安全区内）
function New-Foreground([int]$size, [string]$outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $kw = $size * 0.42
  $kx = ($size - $kw) / 2
  $ky = ($size - $kw) / 2
  $keyPath = New-RoundRect $kx $ky $kw $kw ($size * 0.07)
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.FillPath($whiteBrush, $keyPath)
  $font = New-Object System.Drawing.Font('Segoe UI', [float]($kw * 0.56), [System.Drawing.FontStyle]::Bold)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x1D, 0x4E, 0xD8))
  $g.DrawString('A', $font, $textBrush, (New-Object System.Drawing.RectangleF($kx, $ky, $kw, $kw)), $fmt)
  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "saved $outPath (foreground $size)"
}
foreach ($s in 48, 72, 96, 144, 192) {
  New-Foreground $s (Join-Path $res "foreground-$s.png")
}

# 生成 Windows ICO（256 尺寸 PNG 封装为单条目 ICO）
$png = [System.IO.File]::ReadAllBytes((Join-Path $res 'icon-256.png'))
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([uint16]0)   # reserved
$bw.Write([uint16]1)   # type: icon
$bw.Write([uint16]1)   # count
$bw.Write([byte]0)     # width 256 => 0
$bw.Write([byte]0)     # height 256 => 0
$bw.Write([byte]0)     # palette
$bw.Write([byte]0)     # reserved
$bw.Write([uint16]1)   # planes
$bw.Write([uint16]32)  # bitcount
$bw.Write([uint32]$png.Length)
$bw.Write([uint32]22)  # data offset
$bw.Write($png)
$bw.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $res 'app.ico'), $ms.ToArray())
$bw.Dispose(); $ms.Dispose()
Write-Host "saved app.ico"
