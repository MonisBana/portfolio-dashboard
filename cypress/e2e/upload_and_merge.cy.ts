describe('Upload and Data Merging', () => {
    beforeEach(() => {
        cy.visit('/upload', {
            onBeforeLoad(win) {
                win.indexedDB.deleteDatabase('PortfolioDB');
            }
        });
        // Wait for page to be ready
        cy.contains('Upload Files').should('be.visible');
    });

    it('should upload a Zerodha file and display success', () => {
        cy.get('[data-testid="file-upload-input"]').selectFile('cypress/fixtures/zerodha_sample.xlsx', { force: true });

        // Wait for dialog to open
        cy.contains('Upload File').should('be.visible');

        // Select Broker
        cy.get('[data-testid="broker-select-trigger"]').click({ force: true });
        cy.contains('Zerodha').click({ force: true });

        cy.get('[data-testid="upload-submit-btn"]').click({ force: true });

        // Wait for upload to complete
        cy.contains('Completed', { timeout: 10000 }).should('be.visible');
        cy.contains('zerodha_sample.xlsx').should('be.visible');

        // Verify on Dashboard
        cy.visit('/dashboard');
        cy.contains('₹27,500').should('be.visible');
    });

    it('should merge Groww file correctly with Zerodha', () => {
        // 1. Upload Zerodha
        cy.get('[data-testid="file-upload-input"]').selectFile('cypress/fixtures/zerodha_sample.xlsx', { force: true });
        cy.contains('Upload File').should('be.visible');
        cy.get('[data-testid="broker-select-trigger"]').click({ force: true });
        cy.contains('Zerodha').click({ force: true });
        cy.get('[data-testid="upload-submit-btn"]').click({ force: true });
        cy.contains('Completed', { timeout: 10000 }).should('be.visible');

        // 2. Upload Groww
        cy.get('[data-testid="file-upload-input"]').selectFile('cypress/fixtures/groww_sample.xlsx', { force: true });
        cy.contains('Upload File').should('be.visible');
        cy.get('[data-testid="broker-select-trigger"]').click({ force: true });
        cy.contains('Groww').click({ force: true });
        cy.get('[data-testid="upload-submit-btn"]').click({ force: true });
        cy.contains('groww_sample.xlsx').should('be.visible');
        cy.contains('Completed', { timeout: 10000 }).should('be.visible');

        // 3. Verify Total: 27500 + 33000 = 60500
        cy.visit('/dashboard');
        cy.contains('₹60,500').should('be.visible');
    });

    // it('should handle different owners for same broker', () => {
    //    const totalAmount = 55000;
    //    const filePath = 'cypress/fixtures/zerodha_sample.xlsx';

    //     const uploadFileWithOwner = (owner: string | null) => {
    //         cy.get('[data-testid="file-upload-input"]').selectFile(filePath, { force: true });
    //         cy.contains('Upload File').should('be.visible');
    //         cy.get('[data-testid="broker-select-trigger"]').click();
    //         cy.contains('Zerodha').realClick();
    //         if (owner) {
    //             cy.get('[data-testid="owner-input"]').clear().type(owner);
    //         }
    //         cy.get('[data-testid="upload-submit-btn"]').realClick();
    //         cy.contains('Completed', { timeout: 10000 }).should('be.visible');
    //     };

    //     // Upload Zerodha for Self
    //     uploadFileWithOwner(null);

    //     // Upload Zerodha for Spouse
    //     uploadFileWithOwner('Spouse');

    //     // Verify Total Amount
    //     cy.visit('/dashboard');
    //     cy.contains(`₹${totalAmount}`, { timeout: 10000 }).should('be.visible');
    // });

    it('should upload US stocks (Vested)', () => {
        cy.get('[data-testid="file-upload-input"]').selectFile('cypress/fixtures/vested_sample.xlsx', { force: true });
        cy.contains('Upload File').should('be.visible');
        cy.get('[data-testid="broker-select-trigger"]').click({ force: true });
        cy.contains('Vested').click({ force: true });
        cy.get('[data-testid="upload-submit-btn"]').click({ force: true });
        cy.contains('Completed', { timeout: 10000 }).should('be.visible');

        cy.visit('/dashboard');
        // Wait for loading to finish
        cy.contains('Loading portfolio data...').should('not.exist');

        // Check for specific US stock names to verify data loaded
        cy.contains('Apple Inc').should('be.visible');
        cy.contains('Microsoft Corp').should('be.visible');

        // Total check (loose)
        cy.get('body').should('contain.text', '64,');
    });
});
