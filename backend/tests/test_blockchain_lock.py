from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from uuid import uuid4

from app.services import blockchain_service


class FakeTxHash:
    def hex(self):
        return "ab" * 32


class FakeAccount:
    address = "0x0000000000000000000000000000000000000001"

    def sign_transaction(self, tx):
        return SimpleNamespace(raw_transaction=b"signed")


class FakeEth:
    chain_id = 11155111

    def __init__(self):
        self.registered = False
        self.send_count = 0
        self.account = SimpleNamespace(from_key=lambda key: FakeAccount())

    def get_transaction_count(self, address, state):
        assert state == "pending"
        return 0

    def send_raw_transaction(self, raw):
        self.send_count += 1
        self.registered = True
        return FakeTxHash()

    def wait_for_transaction_receipt(self, tx_hash, timeout):
        return SimpleNamespace(status=1)


class FakeWeb3:
    def __init__(self, eth):
        self.eth = eth

    def to_wei(self, value, unit):
        return 1


class FakeContract:
    def __init__(self, eth):
        self.eth = eth
        self.functions = self

    def verify(self, file_hash):
        return SimpleNamespace(call=lambda: (self.eth.registered, "0x0", 0, 0, "", False, ""))

    def register(self, *args):
        return SimpleNamespace(build_transaction=lambda tx: tx)


def test_register_on_chain_broadcasts_once_for_same_hash(monkeypatch):
    eth = FakeEth()
    client = (FakeWeb3(eth), FakeContract(eth), "private-key")
    monkeypatch.setattr(blockchain_service, "_client", lambda: client)
    file_hash = uuid4().hex * 2

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: blockchain_service.register_on_chain(file_hash, FakeAccount.address, 90), range(8)))

    assert eth.send_count == 1
    assert sum(result is not None for result in results) == 1
