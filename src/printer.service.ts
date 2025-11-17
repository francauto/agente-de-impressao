import fs from "fs";
import net from "net";
import axios from "axios";

export async function sendToPrinter(
  fileUrl: string,
  printerIp: string
): Promise<{ success: boolean; error?: string }> {
  let tempFile = fileUrl; // Pode ser tanto caminho local quanto URL remota

  try {
    // 🧠 1️⃣ Verifica se o parâmetro é uma URL (http ou https)
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      console.log(`🌐 Baixando PDF da URL: ${fileUrl}`);
      const response = await axios.get(fileUrl, { responseType: "arraybuffer" });

      // Cria pasta temporária, se não existir
      fs.mkdirSync("./tmp", { recursive: true });

      // Salva o arquivo temporário
      tempFile = `./tmp/print-${Date.now()}.pdf`;
      fs.writeFileSync(tempFile, response.data);
      console.log(`📥 PDF salvo temporariamente em: ${tempFile}`);
    } else {
      // 📂 Caso seja caminho local, verifica se o arquivo existe
      if (!fs.existsSync(fileUrl)) {
        throw new Error(`Arquivo local não encontrado: ${fileUrl}`);
      }
      console.log(`📄 Usando arquivo local: ${fileUrl}`);
    }

    // 🖨️ 2️⃣ Conecta na impressora via socket (porta 9100)
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      const fileStream = fs.createReadStream(tempFile);

      socket.connect(9100, printerIp, () => {
        console.log(`📡 Conectado à impressora ${printerIp}`);
        fileStream.pipe(socket);
      });

      fileStream.on("end", () => {
        socket.end();
        console.log("✅ Impressão concluída e conexão encerrada");
        resolve();
      });

      socket.on("error", (err) => reject(err));
    });

    // 🧹 3️⃣ Remove o arquivo temporário se for URL remota
    if (fileUrl.startsWith("http") && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log("🧽 Arquivo temporário removido");
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ Erro na impressão:", error.message);
    return { success: false, error: error.message };
  }
}
