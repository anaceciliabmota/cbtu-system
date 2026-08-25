const [major, minor] = process.versions.node.split(".").map(Number);
const ok = major > 20 || (major === 20 && minor >= 19);

if (ok) process.exit(0);

console.error(`
Este frontend (Vite 8) precisa de Node.js 20.19 ou superior.
Versão atual: ${process.version}

Se você usa nvm (já tem o 22 instalado nesta máquina):

  nvm use
  npm run dev

Se o nvm não estiver no PATH deste terminal:

  source ~/.nvm/nvm.sh
  nvm use 22
  npm run dev
`);
process.exit(1);
