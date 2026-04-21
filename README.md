# Whispy — Decentralised Messaging Platform

Whispy is a decentralised social messaging platform that allows users to 
send and receive messages and manage communities without relying on 
centralised servers for data storage.

Built as a Final Degree Project in Software Engineering at the 
University of Seville (2025/26).

## Overview

Whispy is a decentralised messaging platform built as a Final Degree Project in Software Engineering at the University of Seville (2025/26). It explores how encrypted messaging, community management, and user identity can be designed without relying on traditional centralised servers.

The project was implemented using a decentralised data stack centered around Ceramic, OrbisDB and IPFS, together with Ethereum-based identity and end-to-end encryption. Although parts of this ecosystem have evolved significantly since the project was developed, Whispy remains a strong technical exploration of privacy-preserving, user-owned communication systems.

## Tech Stack

- **Frontend:** Next.js, TypeScript
- **Distributed data layer:** Ceramic, OrbisDB, IPFS
- **Identity and anchoring:** Ethereum, DIDs, Solidity
- **Security:** End-to-end encryption (E2EE)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Academic Report

The full technical report (111 pages) covering architecture, 
design decisions, implementation and evaluation is available 
[here](https://github.com/Whispy-Decentralized-chat-application/Whispy-Client/blob/main/whispy_memorandum.pdf).

## Key Features

- Send and receive encrypted messages without central servers
- Create and manage decentralised communities
- User identity managed via DIDs — no account registration required
- Full data sovereignty — users own their data
- Censorship-resistant by design
