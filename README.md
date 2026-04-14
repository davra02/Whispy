# Whispy — Decentralised Messaging Platform

Whispy is a decentralised social messaging platform that allows users to 
send and receive messages and manage communities without relying on 
centralised servers for data storage.

Built as a Final Degree Project in Software Engineering at the 
University of Seville (2025/26).

## Overview

Traditional messaging apps depend on centralised architectures controlled 
by third parties, creating risks of data exploitation, censorship, and 
loss of user sovereignty. Whispy addresses this by combining:

- **Decentralised storage** via Ceramic Network, OrbisDB and IPFS
- **End-to-end encryption (E2EE)** for message confidentiality
- **Blockchain anchoring** for data integrity and identity (DIDs)
- **P2P architecture** with no central server dependency

## Tech Stack

- **Frontend:** Next.js, TypeScript
- **Decentralised storage:** Ceramic Network, OrbisDB, IPFS
- **Blockchain:** Ethereum, Solidity (smart contracts)
- **Encryption:** End-to-end encryption (E2EE)
- **Identity:** Decentralised Identifiers (DIDs)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Academic Report

The full technical report (111 pages) covering architecture, 
design decisions, implementation and evaluation is available 
upon request.

## Key Features

- Send and receive encrypted messages without central servers
- Create and manage decentralised communities
- User identity managed via DIDs — no account registration required
- Full data sovereignty — users own their data
- Censorship-resistant by design
