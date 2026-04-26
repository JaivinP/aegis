#!/usr/bin/env python3
"""Generate a small ElevenLabs text-to-speech test clip.

Usage:
    python3 test.py
    python3 test.py --text "Shipment AGS-0042 requires inspection." --play
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from agents.voice_agent import (
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_TEXT,
    list_voices,
    play_audio,
    synthesize_speech,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", default=DEFAULT_TEXT, help="Text to synthesize.")
    parser.add_argument("--voice-id", default=None, help="ElevenLabs voice ID.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output MP3 path.")
    parser.add_argument("--model-id", default=DEFAULT_MODEL_ID, help="ElevenLabs model ID.")
    parser.add_argument("--output-format", default=DEFAULT_OUTPUT_FORMAT, help="Audio output format.")
    parser.add_argument("--play", action="store_true", help="Play the generated MP3 after saving it.")
    parser.add_argument("--list-voices", action="store_true", help="List voices available to the API key.")
    return parser.parse_args()


def print_voices() -> None:
    voices = list_voices()
    if not voices:
        print("No voices returned for this API key.")
        return

    for voice in voices:
        category = voice.get("category") or "unknown"
        print(f"{voice.get('voice_id')}  {voice.get('name')}  ({category})")


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).expanduser().resolve()

    try:
        if args.list_voices:
            print_voices()
            return 0

        synthesize_speech(
            voice_id=args.voice_id,
            text=args.text,
            output_path=output_path,
            model_id=args.model_id,
            output_format=args.output_format,
        )

        print(f"Wrote {output_path}")

        if args.play:
            play_audio(output_path)
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
