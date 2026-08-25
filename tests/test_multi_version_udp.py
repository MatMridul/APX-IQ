"""
Tests for Multi-Version F1 UDP Decoders and Adapters (2020-2025)
"""

import pytest
from ingestion.decoder import PacketDecoder
from ingestion.adapters import get_adapter_for_format, BasePacketAdapter
from ingestion import (
    packet_structs_20,
    packet_structs_22,
)


@pytest.mark.parametrize("year,expected_label", [
    (2020, "F1 2020"),
    (2021, "F1 2021"),
    (2022, "F1 22"),
    (2023, "F1 23"),
    (2024, "F1 24"),
    (2025, "F1 25"),
])
def test_adapter_factory(year, expected_label):
    adapter = get_adapter_for_format(year)
    assert isinstance(adapter, BasePacketAdapter)
    assert adapter.format_year == year
    assert adapter.label == expected_label


def test_decode_short_packet_ignored():
    assert PacketDecoder.decode(b"too_short") is None


def test_decode_and_adapt_f1_22_telemetry():
    # Build a raw F1 22 Car Telemetry packet
    packet = packet_structs_22.PacketCarTelemetryData()
    packet.m_header.m_packetFormat = 2022
    packet.m_header.m_packetId = packet_structs_22.PACKET_ID_CAR_TELEMETRY
    packet.m_header.m_playerCarIndex = 0

    car_telem = packet.m_carTelemetryData[0]
    car_telem.m_speed = 312
    car_telem.m_throttle = 1.0
    car_telem.m_brake = 0.0
    car_telem.m_steer = -0.05
    car_telem.m_gear = 8
    car_telem.m_engineRPM = 12500
    car_telem.m_drs = 1
    car_telem.m_tyresSurfaceTemperature[0] = 102
    car_telem.m_tyresSurfaceTemperature[1] = 101
    car_telem.m_tyresSurfaceTemperature[2] = 108
    car_telem.m_tyresSurfaceTemperature[3] = 109

    raw_bytes = bytes(packet)
    decoded = PacketDecoder.decode(raw_bytes)
    assert decoded is not None
    assert decoded.m_header.m_packetFormat == 2022

    adapter = get_adapter_for_format(2022)
    telem_dict = adapter.extract_telemetry(decoded, player_idx=0)

    assert telem_dict["speed_kph"] == 312.0
    assert telem_dict["throttle"] == 1.0
    assert telem_dict["drs"] is True
    assert telem_dict["tyre_surface_temps"] == [102, 101, 108, 109]


def test_decode_and_adapt_f1_20_lap_data_seconds_to_ms():
    # F1 2020 used float32 seconds for lap times
    packet = packet_structs_20.PacketLapData()
    packet.m_header.m_packetFormat = 2020
    packet.m_header.m_packetId = packet_structs_20.PACKET_ID_LAP_DATA
    packet.m_header.m_playerCarIndex = 0

    lap = packet.m_lapData[0]
    lap.m_currentLapTime = 74.520 # 74.52s = 74520ms
    lap.m_lastLapTime = 75.100    # 75.10s = 75100ms
    lap.m_currentLapNum = 14
    lap.m_lapDistance = 2400.0

    raw_bytes = bytes(packet)
    decoded = PacketDecoder.decode(raw_bytes)
    assert decoded is not None

    adapter = get_adapter_for_format(2020)
    lap_dict = adapter.extract_lap_data(decoded, player_idx=0)

    assert lap_dict["current_lap_time_ms"] == 74520
    assert lap_dict["last_lap_time_ms"] == 75100
    assert lap_dict["lap_number"] == 14
