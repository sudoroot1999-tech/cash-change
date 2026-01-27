-- NFT Collections Table
CREATE TABLE nft_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    description TEXT,
    collection_type VARCHAR(20) NOT NULL CHECK (collection_type IN ('ERC721', 'ERC1155')),
    creator_address VARCHAR(42) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    banner_image_url TEXT,
    profile_image_url TEXT,
    category VARCHAR(50),
    royalty_recipient VARCHAR(42),
    royalty_percentage DECIMAL(5,2) DEFAULT 0 CHECK (royalty_percentage >= 0 AND royalty_percentage <= 100),
    total_supply BIGINT DEFAULT 0,
    floor_price DECIMAL(36,18),
    total_volume DECIMAL(36,18) DEFAULT 0,
    chain_id INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_creator ON nft_collections(creator_address);
CREATE INDEX idx_collections_verified ON nft_collections(is_verified);
CREATE INDEX idx_collections_chain ON nft_collections(chain_id);
CREATE INDEX idx_collections_category ON nft_collections(category);

-- NFTs Table
CREATE TABLE nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES nft_collections(id) ON DELETE CASCADE,
    token_id VARCHAR(78) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    creator_address VARCHAR(42) NOT NULL,
    metadata_uri TEXT NOT NULL,
    metadata JSONB,
    name VARCHAR(255),
    description TEXT,
    image_url TEXT,
    animation_url TEXT,
    external_url TEXT,
    attributes JSONB,
    rarity_score DECIMAL(10,4),
    rarity_rank INTEGER,
    is_minted BOOLEAN DEFAULT false,
    is_lazy_minted BOOLEAN DEFAULT false,
    mint_signature TEXT,
    mint_voucher JSONB,
    is_fractional BOOLEAN DEFAULT false,
    total_fractions BIGINT,
    is_staked BOOLEAN DEFAULT false,
    is_collateral BOOLEAN DEFAULT false,
    loan_id UUID,
    chain_id INTEGER NOT NULL,
    last_sale_price DECIMAL(36,18),
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contract_address, token_id)
);

CREATE INDEX idx_nfts_owner ON nfts(owner_address);
CREATE INDEX idx_nfts_creator ON nfts(creator_address);
CREATE INDEX idx_nfts_collection ON nfts(collection_id);
CREATE INDEX idx_nfts_contract ON nfts(contract_address);
CREATE INDEX idx_nfts_token ON nfts(token_id);
CREATE INDEX idx_nfts_minted ON nfts(is_minted);
CREATE INDEX idx_nfts_lazy ON nfts(is_lazy_minted);
CREATE INDEX idx_nfts_staked ON nfts(is_staked);
CREATE INDEX idx_nfts_rarity ON nfts(rarity_score);

-- NFT Listings Table
CREATE TABLE nft_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    seller_address VARCHAR(42) NOT NULL,
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('FIXED_PRICE', 'AUCTION', 'BUNDLE', 'DUTCH_AUCTION')),
    price DECIMAL(36,18),
    starting_price DECIMAL(36,18),
    reserve_price DECIMAL(36,18),
    ending_price DECIMAL(36,18),
    currency_address VARCHAR(42),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED')),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    signature TEXT,
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_nft ON nft_listings(nft_id);
CREATE INDEX idx_listings_seller ON nft_listings(seller_address);
CREATE INDEX idx_listings_type ON nft_listings(listing_type);
CREATE INDEX idx_listings_status ON nft_listings(status);
CREATE INDEX idx_listings_end_time ON nft_listings(end_time);

-- NFT Offers Table
CREATE TABLE nft_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES nft_collections(id) ON DELETE CASCADE,
    offer_type VARCHAR(20) NOT NULL CHECK (offer_type IN ('NFT', 'COLLECTION')),
    offerer_address VARCHAR(42) NOT NULL,
    price DECIMAL(36,18) NOT NULL,
    currency_address VARCHAR(42),
    quantity INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    expiry_time TIMESTAMP NOT NULL,
    signature TEXT,
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK ((nft_id IS NOT NULL AND offer_type = 'NFT') OR (collection_id IS NOT NULL AND offer_type = 'COLLECTION'))
);

CREATE INDEX idx_offers_nft ON nft_offers(nft_id);
CREATE INDEX idx_offers_collection ON nft_offers(collection_id);
CREATE INDEX idx_offers_offerer ON nft_offers(offerer_address);
CREATE INDEX idx_offers_status ON nft_offers(status);

-- NFT Transactions Table
CREATE TABLE nft_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES nft_collections(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('MINT', 'TRANSFER', 'SALE', 'AUCTION', 'BURN', 'OFFER', 'BID')),
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    price DECIMAL(36,18),
    currency_address VARCHAR(42),
    quantity INTEGER DEFAULT 1,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    chain_id INTEGER NOT NULL,
    gas_used BIGINT,
    gas_price DECIMAL(36,18),
    marketplace_fee DECIMAL(36,18),
    royalty_fee DECIMAL(36,18),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_nft ON nft_transactions(nft_id);
CREATE INDEX idx_transactions_collection ON nft_transactions(collection_id);
CREATE INDEX idx_transactions_from ON nft_transactions(from_address);
CREATE INDEX idx_transactions_to ON nft_transactions(to_address);
CREATE INDEX idx_transactions_type ON nft_transactions(transaction_type);
CREATE INDEX idx_transactions_tx_hash ON nft_transactions(tx_hash);
CREATE INDEX idx_transactions_created ON nft_transactions(created_at);

-- NFT Royalties Table
CREATE TABLE nft_royalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES nft_collections(id) ON DELETE CASCADE,
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    recipient_address VARCHAR(42) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    is_collection_wide BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_royalties_collection ON nft_royalties(collection_id);
CREATE INDEX idx_royalties_nft ON nft_royalties(nft_id);
CREATE INDEX idx_royalties_recipient ON nft_royalties(recipient_address);

-- NFT Bundles Table
CREATE TABLE nft_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_address VARCHAR(42) NOT NULL,
    price DECIMAL(36,18) NOT NULL,
    currency_address VARCHAR(42),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bundles_creator ON nft_bundles(creator_address);
CREATE INDEX idx_bundles_status ON nft_bundles(status);

-- Bundle Items (many-to-many)
CREATE TABLE nft_bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES nft_bundles(id) ON DELETE CASCADE,
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bundle_id, nft_id)
);

CREATE INDEX idx_bundle_items_bundle ON nft_bundle_items(bundle_id);
CREATE INDEX idx_bundle_items_nft ON nft_bundle_items(nft_id);

-- NFT Bids Table (for auctions)
CREATE TABLE nft_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES nft_listings(id) ON DELETE CASCADE,
    bidder_address VARCHAR(42) NOT NULL,
    bid_amount DECIMAL(36,18) NOT NULL,
    currency_address VARCHAR(42),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'OUTBID', 'CANCELLED', 'REFUNDED')),
    tx_hash VARCHAR(66),
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bids_listing ON nft_bids(listing_id);
CREATE INDEX idx_bids_bidder ON nft_bids(bidder_address);
CREATE INDEX idx_bids_status ON nft_bids(status);
CREATE INDEX idx_bids_amount ON nft_bids(bid_amount);

-- NFT Fractions Table
CREATE TABLE nft_fractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    vault_address VARCHAR(42) NOT NULL,
    fraction_token_address VARCHAR(42) NOT NULL,
    total_fractions BIGINT NOT NULL,
    available_fractions BIGINT NOT NULL,
    fraction_price DECIMAL(36,18),
    currency_address VARCHAR(42),
    owner_address VARCHAR(42) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'REDEEMED')),
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fractions_nft ON nft_fractions(nft_id);
CREATE INDEX idx_fractions_vault ON nft_fractions(vault_address);
CREATE INDEX idx_fractions_owner ON nft_fractions(owner_address);

-- Fraction Ownership Table
CREATE TABLE fraction_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fraction_id UUID REFERENCES nft_fractions(id) ON DELETE CASCADE,
    owner_address VARCHAR(42) NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fraction_id, owner_address)
);

CREATE INDEX idx_fraction_ownership_fraction ON fraction_ownership(fraction_id);
CREATE INDEX idx_fraction_ownership_owner ON fraction_ownership(owner_address);

-- NFT Staking Table
CREATE TABLE nft_staking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    staker_address VARCHAR(42) NOT NULL,
    staking_pool_id UUID,
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unstaked_at TIMESTAMP,
    reward_token_address VARCHAR(42),
    rewards_earned DECIMAL(36,18) DEFAULT 0,
    rewards_claimed DECIMAL(36,18) DEFAULT 0,
    apy DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'UNSTAKED')),
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_staking_nft ON nft_staking(nft_id);
CREATE INDEX idx_staking_staker ON nft_staking(staker_address);
CREATE INDEX idx_staking_pool ON nft_staking(staking_pool_id);
CREATE INDEX idx_staking_status ON nft_staking(status);

-- NFT Loans Table (NFT as collateral)
CREATE TABLE nft_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    borrower_address VARCHAR(42) NOT NULL,
    lender_address VARCHAR(42),
    loan_amount DECIMAL(36,18) NOT NULL,
    loan_currency_address VARCHAR(42),
    interest_rate DECIMAL(10,4) NOT NULL,
    loan_duration INTEGER NOT NULL,
    collateral_valuation DECIMAL(36,18),
    ltv_ratio DECIMAL(5,2),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    repayment_amount DECIMAL(36,18),
    status VARCHAR(20) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'ACTIVE', 'REPAID', 'DEFAULTED', 'LIQUIDATED', 'CANCELLED')),
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loans_nft ON nft_loans(nft_id);
CREATE INDEX idx_loans_borrower ON nft_loans(borrower_address);
CREATE INDEX idx_loans_lender ON nft_loans(lender_address);
CREATE INDEX idx_loans_status ON nft_loans(status);

-- NFT Favorites Table
CREATE TABLE nft_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    user_address VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nft_id, user_address)
);

CREATE INDEX idx_favorites_nft ON nft_favorites(nft_id);
CREATE INDEX idx_favorites_user ON nft_favorites(user_address);

-- NFT Views Table
CREATE TABLE nft_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    user_address VARCHAR(42),
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_views_nft ON nft_views(nft_id);
CREATE INDEX idx_views_user ON nft_views(user_address);
CREATE INDEX idx_views_date ON nft_views(viewed_at);

-- NFT Achievement/Badge System
CREATE TABLE nft_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    badge_image_url TEXT,
    achievement_type VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    is_transferable BOOLEAN DEFAULT false,
    rarity VARCHAR(20) CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_type ON nft_achievements(achievement_type);

-- User Achievements (awarded badges)
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id UUID REFERENCES nft_achievements(id) ON DELETE CASCADE,
    user_address VARCHAR(42) NOT NULL,
    nft_id UUID REFERENCES nfts(id) ON DELETE SET NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(achievement_id, user_address)
);

CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_address);

-- NFT Gated Content Table
CREATE TABLE nft_gated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    content_url TEXT,
    gate_type VARCHAR(20) NOT NULL CHECK (gate_type IN ('NFT', 'COLLECTION', 'TRAIT')),
    required_nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    required_collection_id UUID REFERENCES nft_collections(id) ON DELETE CASCADE,
    required_traits JSONB,
    creator_address VARCHAR(42) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gated_content_nft ON nft_gated_content(required_nft_id);
CREATE INDEX idx_gated_content_collection ON nft_gated_content(required_collection_id);
CREATE INDEX idx_gated_content_creator ON nft_gated_content(creator_address);

-- User Avatars (NFTs used as avatars)
CREATE TABLE user_avatars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address VARCHAR(42) NOT NULL UNIQUE,
    nft_id UUID REFERENCES nfts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_avatars_user ON user_avatars(user_address);
CREATE INDEX idx_avatars_nft ON user_avatars(nft_id);

-- Update Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nft_collections_updated_at BEFORE UPDATE ON nft_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nfts_updated_at BEFORE UPDATE ON nfts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_listings_updated_at BEFORE UPDATE ON nft_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_offers_updated_at BEFORE UPDATE ON nft_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_royalties_updated_at BEFORE UPDATE ON nft_royalties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_bundles_updated_at BEFORE UPDATE ON nft_bundles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_fractions_updated_at BEFORE UPDATE ON nft_fractions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraction_ownership_updated_at BEFORE UPDATE ON fraction_ownership FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_staking_updated_at BEFORE UPDATE ON nft_staking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nft_loans_updated_at BEFORE UPDATE ON nft_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
