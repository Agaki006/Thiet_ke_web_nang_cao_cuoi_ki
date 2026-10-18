import { BrowserProvider } from 'ethers'

declare global {
  interface Window { ethereum?: unknown }
}

export function hasWallet() {
  return typeof window !== 'undefined' && Boolean(window.ethereum)
}

export async function connectWallet(): Promise<string> {
  if (!hasWallet()) throw new Error('Chưa tìm thấy MetaMask trong trình duyệt.')
  const provider = new BrowserProvider(window.ethereum as never)
  await provider.send('eth_requestAccounts', [])
  const signer = await provider.getSigner()
  return signer.getAddress()
}

export async function signWalletMessage(message: string): Promise<{ address: string; signature: string }> {
  if (!hasWallet()) throw new Error('Chưa tìm thấy MetaMask trong trình duyệt.')
  const provider = new BrowserProvider(window.ethereum as never)
  const signer = await provider.getSigner()
  return { address: await signer.getAddress(), signature: await signer.signMessage(message) }
}
