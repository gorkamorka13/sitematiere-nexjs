---
name: windows-terminal-commands
description: Windows PowerShell and CMD command execution protocols - avoid chaining operators
license: MIT
compatibility: opencode
metadata:
  audience: developers
  environment: windows
  shell: powershell-cmd
---

# Windows Terminal Command Directives

## 🪟 Windows Shell Limitations

When executing terminal commands on Windows (PowerShell/CMD), **command chaining operators are NOT supported**:

### ❌ FORBIDDEN OPERATORS
```bash
# These will FAIL on Windows:
npm install && npm run dev
git add . && git commit -m "message"
cd folder && ls
command1 || command2
```

### ✅ CORRECT APPROACH
Execute commands **individually**:

```bash
npm install
npm run dev

git add .
git commit -m "message"

cd folder
ls
```

## 📋 Command Execution Protocol

1. **Atomic Commands**: Each command must be executed separately
2. **Sequential Execution**: Run multiple commands one after another
3. **Error Handling**: Check each command's success before proceeding
4. **Cross-Platform**: Avoid shell-specific operators for Windows compatibility

## 🔄 Alternative Patterns

### For Conditional Logic:
```bash
# Instead of: command1 && command2
# Use separate execution:
command1
if ($LASTEXITCODE -eq 0) { command2 }  # PowerShell
# OR check output before proceeding
```

### For Command Groups:
```bash
# Instead of: command1 && command2 && command3
# Use script files or step-by-step execution:
command1
command2  
command3
```

## ⚠️ Impact on Development Workflows

- **Build scripts**: Use separate npm scripts or batch files
- **Git operations**: Commit and push in separate commands
- **Deployment pipelines**: Use individual steps rather than chained commands
- **Testing**: Run test commands sequentially

## 🛠️ Windows-Specific Alternatives

```powershell
# PowerShell approach for chaining
Try { command1 } Catch { Write-Error "Failed at command1" }
Try { command2 } Catch { Write-Error "Failed at command2" }

# Batch file approach for multiple commands
@echo off
command1
if %errorlevel% neq 0 exit /b 1
command2
if %errorlevel% neq 0 exit /b 1
```

---
*Critical for Windows environments - prevents command execution failures*