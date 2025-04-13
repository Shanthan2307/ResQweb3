use anchor_lang::prelude::*;

// Program ID
// Replace with your program's actual deployed address when needed
declare_id!("Fg6PaFpoGXkYsidMpWxqSWwMqKSP8sSviwe8uVXShM1L");

#[program]
pub mod resq_solana_contract {
    use super::*;

    // Function to log a fulfilled order
    pub fn log_order_fulfillment(
        ctx: Context<LogOrderFulfillment>,
        resource_type: String,
        quantity: u64,
        recipient_firestation: Pubkey,
        fulfilled_by: Pubkey,
        description: String,
        is_volunteer: bool,
    ) -> Result<()> {
        let log = &mut ctx.accounts.fulfillment_log;
        log.resource_type = resource_type;
        log.quantity = quantity;
        log.recipient_firestation = recipient_firestation;
        log.fulfilled_by = fulfilled_by;
        log.description = description;
        log.is_volunteer = is_volunteer;
        log.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }

    // Function to handle donations in USDC from NGOs or Local users
    pub fn donate_usdc(
        ctx: Context<DonateUSDC>,
        amount: u64,
        to_firestation: Pubkey,
        donor_type: String, // e.g., "NGO" or "Local"
    ) -> Result<()> {
        let donation = &mut ctx.accounts.donation_log;
        donation.amount = amount;
        donation.to_firestation = to_firestation;
        donation.from = *ctx.accounts.donor.key;
        donation.donor_type = donor_type;
        donation.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

// Contexts
#[derive(Accounts)]
pub struct LogOrderFulfillment<'info> {
    #[account(init, payer = signer, space = FulfillmentLog::LEN)]
    pub fulfillment_log: Account<'info, FulfillmentLog>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DonateUSDC<'info> {
    #[account(init, payer = donor, space = DonationLog::LEN)]
    pub donation_log: Account<'info, DonationLog>,

    #[account(mut)]
    pub donor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Account Structures
#[account]
pub struct FulfillmentLog {
    pub resource_type: String,
    pub quantity: u64,
    pub recipient_firestation: Pubkey,
    pub fulfilled_by: Pubkey,
    pub description: String,
    pub is_volunteer: bool,
    pub timestamp: i64,
}

impl FulfillmentLog {
    pub const LEN: usize = 8 + (4 + 64) + 8 + 32 + 32 + (4 + 128) + 1 + 8;
}

#[account]
pub struct DonationLog {
    pub amount: u64,
    pub to_firestation: Pubkey,
    pub from: Pubkey,
    pub donor_type: String,
    pub timestamp: i64,
}

impl DonationLog {
    pub const LEN: usize = 8 + 32 + 32 + (4 + 64) + 8;
}
