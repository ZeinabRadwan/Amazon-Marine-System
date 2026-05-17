const fs = require('fs')
const path = 'c:/xampp/htdocs/Amazon-Marine-System/front/src/pages/Pricing/components/OfferDetailModal.jsx'
let text = fs.readFileSync(path, 'utf8')

// Fix mistaken </motion> closing tags from a bad edit
text = text.replace('          </motion>\n        </motion>', '          </motion>\n        </motion>')

const deleteBlock = `
      {deleteConfirmOpen ? (
        <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="offer-delete-title">
          <motion
            className="clients-modal-backdrop"
            onClick={() => !deleteLoading && setDeleteConfirmOpen(false)}
            aria-hidden
          />
          <div className="clients-modal-content">
            <h2 id="offer-delete-title">{t('pricing.confirmDeleteRate', 'Delete this pricing rate?')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
              {t(
                'pricing.confirmDeleteRateHint',
                'This action cannot be undone. The rate will be permanently removed.'
              )}
            </p>
            <div className="clients-modal-actions">
              <button
                type="button"
                className="clients-btn"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="clients-btn clients-btn--danger"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
              >
                {deleteLoading ? t('common.deleting', 'Deleting…') : t('pricing.actionDelete', 'Delete')}
              </button>
            </motion>
          </motion>
        </motion>
      ) : null}
`

const anchor = '      </motion>\n    </motion>\n  )\n}'
if (!text.includes(anchor)) {
  console.error('anchor not found, tail:', JSON.stringify(text.slice(-150)))
  process.exit(1)
}
text = text.replace(anchor, `      </motion>${deleteBlock}\n    </motion>\n  )\n}`)

// Normalize any stray motion tags to div
text = text.replace(/<\/motion>/g, '</div>').replace(/<motion(\s)/g, '<div$1')

fs.writeFileSync(path, text)
console.log('fixed')
