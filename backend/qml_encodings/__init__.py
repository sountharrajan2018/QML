"""Quantum machine learning data-encoding demos (NumPy state-vector simulator)."""
from .datasets import all_datasets, get_dataset
from .encodings import ENCODINGS, encode, encoding_metadata
from .kernels import evaluate
from .simulator import simulate, state_report

__all__ = ["ENCODINGS", "all_datasets", "encode", "encoding_metadata", "evaluate",
           "get_dataset", "simulate", "state_report"]
