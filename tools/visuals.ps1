param([string]$SpecFile, [string]$OutDir)
# Draws the handbook's teaching visuals (keyboards, staff, rhythm, ...) as PNGs.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$NAVY   = [System.Drawing.ColorTranslator]::FromHtml("#153B7A")
$PINK   = [System.Drawing.ColorTranslator]::FromHtml("#FF8FB3")
$YELLOW = [System.Drawing.ColorTranslator]::FromHtml("#FFD85A")
$BLUE   = [System.Drawing.ColorTranslator]::FromHtml("#56B6FF")
$LBLUE  = [System.Drawing.ColorTranslator]::FromHtml("#EEF7FF")
$GREEN  = [System.Drawing.ColorTranslator]::FromHtml("#8DD764")
$GRAY   = [System.Drawing.ColorTranslator]::FromHtml("#8A97A8")
$KEYW   = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
$KEYB   = [System.Drawing.ColorTranslator]::FromHtml("#1F2433")
$SKIN   = [System.Drawing.ColorTranslator]::FromHtml("#F2CFAE")

function Font($size, $bold = $true, $family = "Segoe UI") {
  $style = if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
  New-Object System.Drawing.Font($family, [single]$size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}
function Brush($c) { New-Object System.Drawing.SolidBrush($c) }
function Pen($c, $w) { New-Object System.Drawing.Pen($c, [single]$w) }
function Center($g, $text, $font, $brush, $cx, $cy) {
  $sz = $g.MeasureString($text, $font)
  $g.DrawString($text, $font, $brush, [single]($cx - $sz.Width / 2), [single]($cy - $sz.Height / 2))
}
function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); $p
}
function NewCanvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"; $g.TextRenderingHint = "AntiAliasGridFit"
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

$PC = @{ C = 0; D = 2; E = 4; F = 5; G = 7; A = 9; B = 11 }
function Midi($name) {
  $m = [regex]::Match($name, '^([A-G])(#|b)?(\d)$')
  $v = 12 * ([int]$m.Groups[3].Value + 1) + $PC[$m.Groups[1].Value]
  if ($m.Groups[2].Value -eq "#") { $v++ } elseif ($m.Groups[2].Value -eq "b") { $v-- }
  return $v
}
$BLACKPC = @(1, 3, 6, 8, 10)
$LETTERS = @("C", "", "D", "", "E", "F", "", "G", "", "A", "", "B")

# Keyboard from..to (midi), lit = hashtable midi -> label. Returns nothing; draws in box.
function DrawKeys($g, $x, $y, $w, $h, $from, $to, $lit, $names, $litColor, $pinkKeys = @()) {
  $whites = @(); for ($m = $from; $m -le $to; $m++) { if ($BLACKPC -notcontains ($m % 12)) { $whites += $m } }
  $kw = $w / $whites.Count
  $fontName = Font ([Math]::Min(34, $kw * 0.42)) $true
  $fontLab = Font ([Math]::Min(34, $kw * 0.46)) $true
  for ($i = 0; $i -lt $whites.Count; $i++) {
    $m = $whites[$i]; $kx = $x + $i * $kw
    $fill = if ($pinkKeys -contains $m) { $PINK } elseif ($lit.ContainsKey($m)) { $litColor } else { $KEYW }
    $rr = RoundRect ($kx + 2) $y ($kw - 4) $h 10
    $g.FillPath((Brush $fill), $rr); $g.DrawPath((Pen $NAVY 3), $rr)
    if ($names) { Center $g $LETTERS[$m % 12] $fontName (Brush $GRAY) ($kx + $kw / 2) ($y + $h - 30) }
    if ($lit.ContainsKey($m)) {
      $lab = $lit[$m]
      $f = if ($lab.Length -gt 3) { Font ([Math]::Min(26, $kw * 0.32)) $true } else { $fontLab }
      Center $g $lab $f (Brush $NAVY) ($kx + $kw / 2) ($y + $h - ($(if ($names) { 78 } else { 40 })))
    }
  }
  $bw = $kw * 0.6; $bh = $h * 0.6
  for ($i = 0; $i -lt $whites.Count; $i++) {
    $b = $whites[$i] + 1
    if ($BLACKPC -notcontains ($b % 12) -or $b -gt $to) { continue }
    $bx = $x + ($i + 1) * $kw - $bw / 2
    $fill = if ($lit.ContainsKey($b)) { $PINK } else { $KEYB }
    $rr = RoundRect $bx $y $bw $bh 6
    $g.FillPath((Brush $fill), $rr)
    if ($lit.ContainsKey($b)) { Center $g $lit[$b] (Font ([Math]::Min(26, $bw * 0.5)) $true) (Brush $NAVY) ($bx + $bw / 2) ($y + $bh - 28) }
  }
}

function StaffLines($g, $x, $y, $w, $gap) { for ($i = 0; $i -lt 5; $i++) { $g.DrawLine((Pen $NAVY 3), [single]$x, [single]($y + $i * $gap), [single]($x + $w), [single]($y + $i * $gap)) } }
# step: 0 = bottom line, 1 = first space, ..., 8 = top line
function StepY($y, $gap, $step) { return $y + 4 * $gap - $step * $gap / 2 }
function Clef($g, $clef, $x, $y, $gap) {
  if ($clef -eq "G") { $ch = [char]::ConvertFromUtf32(0x1D11E); $f = Font ($gap * 7.2) $false "Segoe UI Symbol"; $g.DrawString($ch, $f, (Brush $NAVY), [single]($x), [single]($y - $gap * 2.35)) }
  else { $ch = [char]::ConvertFromUtf32(0x1D122); $f = Font ($gap * 3.6) $false "Segoe UI Symbol"; $g.DrawString($ch, $f, (Brush $NAVY), [single]($x), [single]($y - $gap * 0.42)) }
}
function NoteHead($g, $cx, $cy, $gap, $filled, $color) {
  $w = $gap * 1.35; $h = $gap * 0.95
  $st = $g.Save(); $g.TranslateTransform([single]$cx, [single]$cy); $g.RotateTransform(-20)
  if ($filled) { $g.FillEllipse((Brush $color), [single](-$w / 2), [single](-$h / 2), [single]$w, [single]$h) }
  else { $g.FillEllipse((Brush $KEYW), [single](-$w / 2), [single](-$h / 2), [single]$w, [single]$h); $g.DrawEllipse((Pen $color 4), [single](-$w / 2), [single](-$h / 2), [single]$w, [single]$h) }
  $g.Restore($st)
}
function DrawStaff($g, $x, $y, $w, $gap, $spec) {
  StaffLines $g $x $y $w $gap
  $cx = $x + 20
  $marks = @()   # x centres of clef / key signature / time signature, for labels
  if ($spec.clef) { Clef $g $spec.clef $cx $y $gap; $marks += ($cx + $gap * 1.5); $cx += $gap * 5.2 }
  if ($spec.keySig -eq "#") {
    $ks = Font ($gap * 2.0) $true "Segoe UI Symbol"
    $g.DrawString([string][char]0x266F, $ks, (Brush $PINK), [single]$cx, [single]((StepY $y $gap 8) - $gap * 0.95))
    $marks += ($cx + $gap * 0.8); $cx += $gap * 2.4
  }
  if ($spec.time) {
    $parts = $spec.time.Split("/"); $tf = Font ($gap * 2.0) $true "Georgia"
    Center $g $parts[0] $tf (Brush $NAVY) ($cx + $gap) ($y + $gap * 1.0)
    Center $g $parts[1] $tf (Brush $NAVY) ($cx + $gap) ($y + $gap * 3.0)
    $marks += ($cx + $gap); $cx += $gap * 2.8
  }
  if ($spec.labels) {
    # Labels fan out to the right so they never overlap, with a line down to each mark.
    $lf = Font 34 $true
    for ($i = 0; $i -lt $spec.labels.Count; $i++) {
      $lx = $x + 170 + $i * 330; $ly = $y + $gap * 6.7
      $rr = RoundRect ($lx - 150) $ly 300 58 18
      $g.DrawLine((Pen $NAVY 3), [single]$marks[$i], [single]($y + $gap * 4.2), [single]$lx, [single]$ly)
      $g.FillPath((Brush $YELLOW), $rr); Center $g ("" + ($i + 1) + ". " + $spec.labels[$i]) $lf (Brush $NAVY) $lx ($ly + 29)
    }
  }
  if ($spec.numbered) {
    $lf = Font ($gap * 0.8) $true
    for ($i = 0; $i -lt 5; $i++) { Center $g ("Garis " + ($i + 1)) $lf (Brush $NAVY) ($x - 90) (StepY $y $gap ($i * 2)) }
    for ($i = 0; $i -lt 4; $i++) { Center $g ("Spasi " + ($i + 1)) $lf (Brush $PINK) ($x + $w * 0.6) (StepY $y $gap ($i * 2 + 1)) }
    NoteHead $g ($x + $w * 0.25) (StepY $y $gap 4) $gap $true $NAVY
    Center $g "not di garis" (Font 34 $true) (Brush $NAVY) ($x + $w * 0.25) ($y + $gap * 5.2)
    NoteHead $g ($x + $w * 0.88) (StepY $y $gap 5) $gap $true $PINK
    Center $g "not di spasi" (Font 34 $true) (Brush $PINK) ($x + $w * 0.88) ($y + $gap * 5.2)
  }
  if ($spec.notes) {
    $n = $spec.notes.Count; $span = ($x + $w - 40) - ($cx + 30)
    for ($i = 0; $i -lt $n; $i++) {
      $nt = $spec.notes[$i]; $nx = $cx + 30 + ($i + 0.5) * $span / $n; $ny = StepY $y $gap $nt.step
      for ($l = -2; $l -ge $nt.step; $l -= 2) { $ly = StepY $y $gap $l; $g.DrawLine((Pen $NAVY 3), [single]($nx - $gap), [single]$ly, [single]($nx + $gap), [single]$ly) }
      for ($l = 10; $l -le $nt.step; $l += 2) { $ly = StepY $y $gap $l; $g.DrawLine((Pen $NAVY 3), [single]($nx - $gap), [single]$ly, [single]($nx + $gap), [single]$ly) }
      NoteHead $g $nx $ny $gap $true $NAVY
      $lab = RoundRect ($nx - 40) ($y + $gap * 6.0) 80 64 18
      $g.FillPath((Brush $YELLOW), $lab); Center $g $nt.label (Font 44 $true) (Brush $NAVY) $nx ($y + $gap * 6.0 + 32)
    }
  }
}

function DrawRhythmItem($g, $kind, $cx, $baseY, $gap) {
  $headY = $baseY
  switch ($kind) {
    "q"  { NoteHead $g $cx $headY $gap $true $NAVY; $g.DrawLine((Pen $NAVY 5), [single]($cx + $gap * 0.62), [single]$headY, [single]($cx + $gap * 0.62), [single]($headY - $gap * 3.4)) }
    "h"  { NoteHead $g $cx $headY $gap $false $NAVY; $g.DrawLine((Pen $NAVY 5), [single]($cx + $gap * 0.62), [single]$headY, [single]($cx + $gap * 0.62), [single]($headY - $gap * 3.4)) }
    "dh" { NoteHead $g $cx $headY $gap $false $NAVY; $g.DrawLine((Pen $NAVY 5), [single]($cx + $gap * 0.62), [single]$headY, [single]($cx + $gap * 0.62), [single]($headY - $gap * 3.4)); $g.FillEllipse((Brush $PINK), [single]($cx + $gap * 1.2), [single]($headY - 8), 16, 16) }
    "w"  { NoteHead $g $cx $headY ($gap * 1.15) $false $NAVY }
    "qr" { $f = Font ($gap * 3.4) $false "Segoe UI Symbol"; Center $g ([char]::ConvertFromUtf32(0x1D13D)) $f (Brush $NAVY) $cx ($headY - $gap * 1.2) }
    "hr" { $g.DrawLine((Pen $NAVY 3), [single]($cx - $gap * 1.4), [single]$headY, [single]($cx + $gap * 1.4), [single]$headY); $g.FillRectangle((Brush $NAVY), [single]($cx - $gap * 0.7), [single]($headY - $gap * 0.5), [single]($gap * 1.4), [single]($gap * 0.5)) }
    "wr" { $g.DrawLine((Pen $NAVY 3), [single]($cx - $gap * 1.4), [single]($headY - $gap), [single]($cx + $gap * 1.4), [single]($headY - $gap)); $g.FillRectangle((Brush $NAVY), [single]($cx - $gap * 0.7), [single]($headY - $gap), [single]($gap * 1.4), [single]($gap * 0.5)) }
  }
}

function Hand($g, $x, $y, $s, $label, $mirror) {
  # fingers: thumb .. pinky ; mirror for left hand
  $fingers = @(@{ n = 1; fx = 0.17; fy = 0.40; h = 0.26; r = -40 }, @{ n = 2; fx = 0.28; fy = 0.10; h = 0.44; r = -6 }, @{ n = 3; fx = 0.43; fy = 0.04; h = 0.50; r = 0 }, @{ n = 4; fx = 0.58; fy = 0.09; h = 0.45; r = 6 }, @{ n = 5; fx = 0.72; fy = 0.22; h = 0.34; r = 14 })
  $fw = $s * 0.14
  foreach ($f in $fingers) {
    $fx = if ($mirror) { 1 - $f.fx - 0.14 } else { $f.fx }; $rot = if ($mirror) { -$f.r } else { $f.r }
    $px = $x + $fx * $s; $py = $y + $f.fy * $s; $ph = $f.h * $s + $s * 0.12
    $st = $g.Save(); $g.TranslateTransform([single]($px + $fw / 2), [single]($py + $ph)); $g.RotateTransform([single]$rot)
    $rr = RoundRect (-$fw / 2) (-$ph) $fw $ph ($fw / 2); $g.FillPath((Brush $SKIN), $rr); $g.DrawPath((Pen $NAVY 3), $rr)
    $cir = $fw * 0.92; $g.FillEllipse((Brush $YELLOW), [single](-$cir / 2), [single](-$ph + 8), [single]$cir, [single]$cir)
    Center $g ("" + $f.n) (Font ($cir * 0.62) $true) (Brush $NAVY) 0 (-$ph + 8 + $cir / 2)
    $g.Restore($st)
  }
  $palmX = if ($mirror) { $x + $s * 0.14 } else { $x + $s * 0.24 }
  $rr = RoundRect $palmX ($y + $s * 0.5) ($s * 0.62) ($s * 0.46) ($s * 0.16); $g.FillPath((Brush $SKIN), $rr); $g.DrawPath((Pen $NAVY 3), $rr)
  Center $g $label (Font ($s * 0.1) $true) (Brush $NAVY) ($palmX + $s * 0.31) ($y + $s * 0.76)
}

$specs = Get-Content $SpecFile -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($item in $specs) {
  $v = $item.spec; $W = 1600; $H = 420
  switch ($v.type) {
    "keys" {
      $from = Midi $v.from; $to = Midi $v.to
      $lit = @{}; foreach ($p in $v.lit.PSObject.Properties) { $lit[(Midi $p.Name)] = $p.Value }
      $whites = 0; for ($m = $from; $m -le $to; $m++) { if ($BLACKPC -notcontains ($m % 12)) { $whites++ } }
      $W = [Math]::Min(1600, [Math]::Max(700, $whites * 110)); $H = 380
      $pk = @(); if ($v.pink) { $pk = @($v.pink | ForEach-Object { Midi $_ }) }
      $c = NewCanvas $W $H; DrawKeys $c[1] 6 6 ($W - 12) ($H - 12) $from $to $lit ([bool]$v.names) $YELLOW $pk
    }
    "chords" {
      $n = $v.items.Count; $cw = 520; $W = $n * $cw + ($n - 1) * 40; $H = 400
      $c = NewCanvas $W $H
      for ($i = 0; $i -lt $n; $i++) {
        $it = $v.items[$i]; $ms = @($it.notes | ForEach-Object { Midi $_ })
        $lo = [int](($ms | Measure-Object -Minimum).Minimum); $hi = [int](($ms | Measure-Object -Maximum).Maximum)
        # One octave from the C below the chord, stretched just enough to fit its top note.
        $from = [int]($lo - ($lo % 12)); $to = [int][Math]::Max($from + 11, $hi + 2)
        if ($BLACKPC -contains ($to % 12)) { $to++ }
        $lit = @{}; foreach ($m in $ms) { $lit[$m] = $LETTERS[$m % 12]; if (-not $lit[$m]) { $lit[$m] = "" } }
        $SH = [string][char]0x266F; $FL = [string][char]0x266D
        foreach ($m in $ms) { if ($BLACKPC -contains ($m % 12)) { $lit[$m] = @{ 1 = "C$SH"; 3 = "E$FL"; 6 = "F$SH"; 8 = "A$FL"; 10 = "B$FL" }[$m % 12] } }
        $ox = $i * ($cw + 40)
        $rr = RoundRect ($ox + $cw / 2 - 110) 4 220 64 22; $c[1].FillPath((Brush $BLUE), $rr)
        Center $c[1] $it.name (Font 38 $true) (Brush $KEYW) ($ox + $cw / 2) 36
        DrawKeys $c[1] $ox 84 $cw 300 $from $to $lit $false $YELLOW
      }
    }
    "hands" {
      $W = 1400; $H = 560; $c = NewCanvas $W $H
      Hand $c[1] 80 20 520 "KIRI" $true
      Hand $c[1] 800 20 520 "KANAN" $false
    }
    "rhythm" {
      $n = $v.items.Count; $W = 1600; $H = 470; $c = NewCanvas $W $H; $gap = 58; $base = 270
      $c[1].DrawLine((Pen $GRAY 4), 40, [single]$base, [single]($W - 40), [single]$base)
      for ($i = 0; $i -lt $n; $i++) {
        $cx = 40 + ($i + 0.5) * ($W - 80) / $n
        DrawRhythmItem $c[1] $v.items[$i] $cx $base $gap
        $bw = [Math]::Min(300, ($W - 80) / $n - 16)
        $rr = RoundRect ($cx - $bw / 2) ($base + 90) $bw 84 24; $c[1].FillPath((Brush $LBLUE), $rr)
        Center $c[1] $v.counts[$i] (Font 44 $true) (Brush $NAVY) $cx ($base + 132)
      }
    }
    "numbers" {
      $n = $v.items.Count; $W = 1400; $H = 360; $c = NewCanvas $W $H
      for ($i = 0; $i -lt $n; $i++) {
        $it = $v.items[$i]; $cx = 60 + ($i + 0.5) * ($W - 120) / $n
        $rr = RoundRect ($cx - 90) 60 180 240 40; $col = if ($it.up -or $it.down) { $YELLOW } else { $LBLUE }
        $c[1].FillPath((Brush $col), $rr)
        Center $c[1] $it.n (Font 150 $true) (Brush $NAVY) $cx 180
        if ($it.up) { $c[1].FillEllipse((Brush $PINK), [single]($cx - 16), 70, 32, 32) }
        if ($it.down) { $c[1].FillEllipse((Brush $PINK), [single]($cx - 16), 258, 32, 32) }
      }
    }
    "pattern" {
      $rows = $v.rows.Count; $W = 1600; $H = 150 + $rows * 150; $c = NewCanvas $W $H
      $lx = 260; $cellW = ($W - $lx - 40) / 4
      for ($b = 0; $b -lt 4; $b++) { Center $c[1] ("Ketuk " + ($b + 1)) (Font 34 $true) (Brush $NAVY) ($lx + ($b + 0.5) * $cellW) 60 }
      for ($r = 0; $r -lt $rows; $r++) {
        $row = $v.rows[$r]; $ry = 110 + $r * 150
        $rr = RoundRect 20 $ry 220 120 26; $c[1].FillPath((Brush $BLUE), $rr); Center $c[1] $row.label (Font 38 $true) (Brush $KEYW) 130 ($ry + 60)
        for ($b = 0; $b -lt 4; $b++) {
          $bx = $lx + $b * $cellW; $kind = $row.beats[$b]
          $fill = switch ($kind) { 1 { $YELLOW } 2 { $LBLUE } 3 { $PINK } }
          $rr = RoundRect ($bx + 10) $ry ($cellW - 20) 120 26; $c[1].FillPath((Brush $fill), $rr)
          $txt = switch ($kind) { 1 { [string][char]0x25CF } 2 { [string][char]0x2014 } 3 { "8va" } }
          Center $c[1] $txt (Font 54 $true) (Brush $NAVY) ($bx + $cellW / 2) ($ry + 60)
        }
      }
    }
    "staff" {
      $W = 1600; $gap = 52; $H = 620; $c = NewCanvas $W $H
      $x0 = if ($v.numbered) { 190 } else { 40 }
      DrawStaff $c[1] $x0 90 ($W - $x0 - 40) $gap $v
    }
    "staff2" {
      $W = 1600; $gap = 46; $H = 600; $c = NewCanvas $W $H
      DrawStaff $c[1] 30 90 740 $gap $v.left
      DrawStaff $c[1] 830 90 740 $gap $v.right
    }
    "times" {
      $n = $v.items.Count; $W = 1600; $gap = 46; $H = 330; $c = NewCanvas $W $H
      for ($i = 0; $i -lt $n; $i++) { $sw = ($W - 60 * ($n - 1)) / $n; DrawStaff $c[1] ($i * ($sw + 60)) 60 $sw $gap @{ clef = "G"; time = $v.items[$i] } }
    }
    "dyn" {
      $n = $v.items.Count; $W = 1600; $H = 340; $c = NewCanvas $W $H
      $arrow = New-Object System.Drawing.Drawing2D.GraphicsPath
      $arrow.AddPolygon(@((New-Object System.Drawing.PointF(60, 290)), (New-Object System.Drawing.PointF(1500, 250)), (New-Object System.Drawing.PointF(1500, 330))))
      $c[1].FillPath((Brush $LBLUE), $arrow)
      for ($i = 0; $i -lt $n; $i++) {
        $f = New-Object System.Drawing.Font("Georgia", [single](70 + $i * 38), ([System.Drawing.FontStyle]::Bold -bor [System.Drawing.FontStyle]::Italic), [System.Drawing.GraphicsUnit]::Pixel)
        Center $c[1] $v.items[$i] $f (Brush $NAVY) (180 + $i * 400) 150
      }
    }
    "grid" {
      $n = $v.cells.Count; $W = 1600; $H = 240; $c = NewCanvas $W $H; $cw = ($W - 40) / $n
      for ($i = 0; $i -lt $n; $i++) {
        $fill = if ($v.lit -contains $i) { $PINK } else { $LBLUE }
        $rr = RoundRect (20 + $i * $cw + 8) 30 ($cw - 16) 180 30; $c[1].FillPath((Brush $fill), $rr)
        Center $c[1] $v.cells[$i] (Font 90 $true) (Brush $NAVY) (20 + ($i + 0.5) * $cw) 120
      }
    }
  }
  $out = Join-Path $OutDir $item.file
  $c[0].Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $c[1].Dispose(); $c[0].Dispose()
  Write-Output ("{0} {1}x{2}" -f $item.file, $W, $H)
}
