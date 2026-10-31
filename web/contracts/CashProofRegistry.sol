// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CashProofRegistry: constancia auditable de caja (CFO de Bolsillo)
/// @notice Registra el hash de una "carpeta de crédito" (extractos + proyección + consentimiento).
///         No custodia fondos ni emite tokens: solo prueba que la carpeta existía en esa fecha y no se alteró.
contract CashProofRegistry {
    struct Constancia {
        address emisor;          // notario de la plataforma
        uint64 fecha;            // block.timestamp del registro
        bytes32 destinatario;    // hash del identificador de la entidad que recibe la carpeta (consentimiento)
    }

    mapping(bytes32 => Constancia) private constancias;

    event ConstanciaRegistrada(bytes32 indexed carpeta, bytes32 indexed destinatario, address emisor, uint64 fecha);

    error YaRegistrada(bytes32 carpeta);

    function registrar(bytes32 carpeta, bytes32 destinatario) external {
        if (constancias[carpeta].fecha != 0) revert YaRegistrada(carpeta);
        constancias[carpeta] = Constancia(msg.sender, uint64(block.timestamp), destinatario);
        emit ConstanciaRegistrada(carpeta, destinatario, msg.sender, uint64(block.timestamp));
    }

    function verificar(bytes32 carpeta) external view returns (bool existe, address emisor, uint64 fecha, bytes32 destinatario) {
        Constancia memory c = constancias[carpeta];
        return (c.fecha != 0, c.emisor, c.fecha, c.destinatario);
    }
}
