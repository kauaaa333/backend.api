param([Parameter(Mandatory=$true)][string]$Email)
$taskflowSecret = Read-Host 'Nova senha (pelo menos 12 caracteres)' -AsSecureString
$taskflowConfirm = Read-Host 'Confirme a nova senha' -AsSecureString
$taskflowPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskflowSecret)
$taskflowConfirmPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskflowConfirm)
try {
  $taskflowValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskflowPointer)
  if ($taskflowValue -cne [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskflowConfirmPointer)) { throw 'As senhas não coincidem.' }
  $env:NOVA_SENHA = $taskflowValue
  node "$PSScriptRoot/definir-senha.cjs" $Email
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível atualizar a senha.' }
} finally {
  Remove-Item Env:NOVA_SENHA -ErrorAction SilentlyContinue
  $taskflowValue = $null
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskflowPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskflowConfirmPointer)
}
