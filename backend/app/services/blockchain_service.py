import json, logging, os, threading
from collections import defaultdict
from pathlib import Path
from web3 import Web3
from eth_utils import to_checksum_address

logger = logging.getLogger(__name__)
_tx_lock = threading.Lock()
_file_locks = defaultdict(threading.Lock)
ABI_PATH = Path(__file__).resolve().parents[1] / "contract_deployment.json"
MIN_ABI = [
    {"inputs":[{"internalType":"bytes32","name":"fileHash","type":"bytes32"},{"internalType":"address","name":"creator","type":"address"},{"internalType":"uint8","name":"originalityScore","type":"uint8"},{"internalType":"string","name":"metadataUrl","type":"string"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"bytes32","name":"fileHash","type":"bytes32"}],"name":"verify","outputs":[{"name":"isRegistered","type":"bool"},{"name":"creator","type":"address"},{"name":"registeredAt","type":"uint256"},{"name":"originalityScore","type":"uint8"},{"name":"metadataUrl","type":"string"},{"name":"isRevoked","type":"bool"},{"name":"revokeReason","type":"string"}],"stateMutability":"view","type":"function"}
]

def _client():
    rpc, private_key, address = os.getenv("WEB3_RPC_URL"), os.getenv("BACKEND_PRIVATE_KEY"), os.getenv("CONTRACT_ADDRESS")
    if not rpc or not private_key or not address: return None
    w3 = Web3(Web3.HTTPProvider(rpc))
    if not w3.is_connected(): raise RuntimeError("Không kết nối được RPC blockchain")
    abi = MIN_ABI
    if ABI_PATH.exists(): abi = json.loads(ABI_PATH.read_text()).get("abi", MIN_ABI)
    return w3, w3.eth.contract(address=to_checksum_address(address), abi=abi), private_key

def register_on_chain(file_hash: str, creator: str, originality: int, metadata_url: str = "") -> str | None:
    client = _client()
    if client is None: return None
    w3, contract, private_key = client
    account = w3.eth.account.from_key(private_key)
    # Cùng một file chỉ được một request kiểm tra/broadcast tại một thời điểm.
    # Lock theo hash vẫn giữ khi chờ receipt, nhưng không khóa các file khác.
    with _file_locks[file_hash]:
        if bool(contract.functions.verify(bytes.fromhex(file_hash)).call()[0]):
            return None
        # Global lock chỉ bao quanh đọc nonce + ký + broadcast.
        with _tx_lock:
            nonce = w3.eth.get_transaction_count(account.address, "pending")
            tx = contract.functions.register(bytes.fromhex(file_hash), to_checksum_address(creator), originality, metadata_url).build_transaction({"from": account.address, "nonce": nonce, "chainId": w3.eth.chain_id, "gas": 350000, "maxFeePerGas": w3.to_wei("30", "gwei"), "maxPriorityFeePerGas": w3.to_wei("1", "gwei")})
            signed = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        if receipt.status != 1: raise RuntimeError("Transaction register bị revert")
        value = tx_hash.hex()
        return value if value.startswith("0x") else "0x" + value

def verify_on_chain(file_hash: str) -> bool:
    client = _client()
    if client is None: return False
    _, contract, _ = client
    return bool(contract.functions.verify(bytes.fromhex(file_hash)).call()[0])
