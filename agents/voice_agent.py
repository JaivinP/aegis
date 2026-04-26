from __future__ import annotations

import json
import os
import subprocess
import sys
from threading import Lock
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO_ROOT / "alert_test.mp3"
DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"
DEFAULT_MODEL_ID = "eleven_flash_v2_5"
DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
DEFAULT_TEXT = "The first move is what sets everything in motion."
_ACTIVE_ALERT_KEYS: set[str] = set()
_ACTIVE_ALERT_LOCK = Lock()


def get_alert_key(payload: Dict[str, Any]) -> str:
    shipment = payload.get("shipment", {})
    return str(
        payload.get("shipmentId")
        or shipment.get("shipmentId")
        or shipment.get("productName")
        or "current-shipment"
    )


def reset_voice_alert(shipment_id: str) -> bool:
    key = str(shipment_id or "current-shipment")
    with _ACTIVE_ALERT_LOCK:
        was_active = key in _ACTIVE_ALERT_KEYS
        _ACTIVE_ALERT_KEYS.discard(key)
    return was_active


def load_voice_env() -> None:
    load_dotenv(REPO_ROOT / "database" / ".env")
    load_dotenv(REPO_ROOT / ".env", override=True)


def synthesize_speech(
    *,
    text: str,
    output_path: Path = DEFAULT_OUTPUT,
    voice_id: Optional[str] = None,
    model_id: str = DEFAULT_MODEL_ID,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
) -> Path:
    load_voice_env()

    api_key = os.getenv("ELEVENLABS_API_KEY")
    selected_voice_id = voice_id or os.getenv("ELEVENLABS_VOICE_ID") or DEFAULT_VOICE_ID
    if not api_key:
        raise RuntimeError("Missing ELEVENLABS_API_KEY.")

    try:
        _request_speech(
            api_key=api_key,
            voice_id=selected_voice_id,
            text=text,
            output_path=output_path,
            model_id=model_id,
            output_format=output_format,
        )
    except RuntimeError as exc:
        if "paid_plan_required" not in str(exc) or selected_voice_id == DEFAULT_VOICE_ID:
            raise

        print(
            f"Voice {selected_voice_id} requires a paid plan; retrying with premade voice {DEFAULT_VOICE_ID}.",
            file=sys.stderr,
        )
        _request_speech(
            api_key=api_key,
            voice_id=DEFAULT_VOICE_ID,
            text=text,
            output_path=output_path,
            model_id=model_id,
            output_format=output_format,
        )

    return output_path


def _request_speech(
    *,
    api_key: str,
    voice_id: str,
    text: str,
    output_path: Path,
    model_id: str,
    output_format: str,
) -> None:
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        f"?output_format={output_format}"
    )
    payload = json.dumps(
        {
            "text": text,
            "model_id": model_id,
        }
    ).encode("utf-8")
    request = Request(
        url,
        data=payload,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            output_path.write_bytes(response.read())
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs request failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Could not reach ElevenLabs: {exc.reason}") from exc


def play_audio(path: Path) -> None:
    if sys.platform == "darwin":
        subprocess.run(["afplay", str(path)], check=True)
        return

    candidates = (["ffplay", "-nodisp", "-autoexit", str(path)], ["mpg123", str(path)])
    for command in candidates:
        try:
            subprocess.run(command, check=True)
            return
        except FileNotFoundError:
            continue

    raise RuntimeError("No supported audio player found. Install ffplay/mpg123 or omit playback.")


def list_voices() -> list[Dict[str, Any]]:
    load_voice_env()

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ELEVENLABS_API_KEY.")

    request = Request(
        "https://api.elevenlabs.io/v1/voices",
        headers={
            "xi-api-key": api_key,
            "Accept": "application/json",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"ElevenLabs request failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Could not reach ElevenLabs: {exc.reason}") from exc

    return payload.get("voices", [])


def build_anomaly_alert_text(payload: Dict[str, Any], narrative_text: str) -> str:
    shipment = payload.get("shipment", {})
    sensors = payload.get("currentSensors", {})
    thresholds = payload.get("thresholds", {})
    shipment_name = (
        shipment.get("productName")
        or shipment.get("name")
        or payload.get("shipmentId")
        or shipment.get("shipmentId")
        or "current shipment"
    )
    temperature = sensors.get("temperature")
    humidity = sensors.get("humidity")
    shock_count = sensors.get("shockCount") or sensors.get("shockDetected")
    seal_status = sensors.get("sealStatus")
    water_exposure = sensors.get("waterExposure")

    issues = []
    temp_min = thresholds.get("tempMin")
    temp_max = thresholds.get("tempMax")
    if temperature is not None and temp_min is not None and temp_max is not None:
        if temperature < temp_min or temperature > temp_max:
            issues.append("temperature out of range")

    humidity_min = thresholds.get("humidityMin")
    humidity_max = thresholds.get("humidityMax")
    if humidity is not None and humidity_min is not None and humidity_max is not None:
        if humidity < humidity_min or humidity > humidity_max:
            issues.append("humidity out of range")

    if shock_count:
        issues.append("shock detected")
    if water_exposure not in [None, False, "DRY"]:
        issues.append("water exposure")
    if seal_status and seal_status != "INTACT":
        issues.append("compromised seal")

    issue_summary = format_issue_list(issues) if issues else "an anomaly"
    classification = extract_classification(narrative_text) or "anomaly"
    return (
        f"Aegis alert. {shipment_name} has {issue_summary}."
        f" Classification: {classification.title()}. Check the dashboard."
    )


def format_issue_list(issues: list[str]) -> str:
    unique_issues = list(dict.fromkeys(issues))
    if len(unique_issues) == 1:
        return unique_issues[0]
    if len(unique_issues) == 2:
        return f"{unique_issues[0]} and {unique_issues[1]}"
    return f"{', '.join(unique_issues[:-1])}, and {unique_issues[-1]}"


def extract_classification(narrative_text: str) -> Optional[str]:
    for line in narrative_text.splitlines():
        if line.upper().startswith("CLASSIFICATION:"):
            return line.split(":", 1)[1].strip().split("/")[0].strip()
    return None


def should_voice_alert(payload: Dict[str, Any], narrative_text: str) -> bool:
    if payload.get("incidentActive"):
        return True

    classification = (extract_classification(narrative_text) or "").upper()
    if classification and classification not in {"NOMINAL", "NONE"}:
        return True

    incident = payload.get("incident") or {}
    return bool(incident)


def alert_for_anomaly(
    payload: Dict[str, Any],
    narrative_text: str,
    *,
    output_path: Path = DEFAULT_OUTPUT,
    play: bool = True,
) -> Dict[str, Any]:
    alert_key = get_alert_key(payload)

    if payload.get("suppressVoice"):
        with _ACTIVE_ALERT_LOCK:
            _ACTIVE_ALERT_KEYS.add(alert_key)
        return {"triggered": False, "suppressed": True, "reason": "active_issue_already_alerted"}

    if not should_voice_alert(payload, narrative_text):
        reset_voice_alert(alert_key)
        return {"triggered": False}

    with _ACTIVE_ALERT_LOCK:
        if alert_key in _ACTIVE_ALERT_KEYS:
            return {"triggered": False, "suppressed": True, "reason": "active_issue_already_alerted"}
        _ACTIVE_ALERT_KEYS.add(alert_key)

    text = build_anomaly_alert_text(payload, narrative_text)
    audio_path = synthesize_speech(text=text, output_path=output_path)

    if play:
        play_audio(audio_path)

    return {
        "triggered": True,
        "text": text,
        "audioPath": str(audio_path),
    }
