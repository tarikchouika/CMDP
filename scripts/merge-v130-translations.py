#!/usr/bin/env python3
"""CMDP — دمج ترجمات الإصدار 1.3.0 (إدارة المتجر + التراتبية + الدخول) في القواميس الأربعة"""
import json
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/src/lib/i18n")

# المفتاح العربي → {fr, en, it, es}
T = {
  "آخر 7 أيام": {"fr": "Derniers 7 jours", "en": "Last 7 days", "it": "Ultimi 7 giorni", "es": "Últimos 7 días"},
  "آخر 30 يوماً": {"fr": "Derniers 30 jours", "en": "Last 30 days", "it": "Ultimi 30 giorni", "es": "Últimos 30 días"},
  "آخر 90 يوماً": {"fr": "Derniers 90 jours", "en": "Last 90 days", "it": "Ultimi 90 giorni", "es": "Últimos 90 días"},
  "أضف أول منتج لتعاونيتكم ليظهر في متجر المنصة العمومي": {"fr": "Ajoutez le premier produit de votre coopérative pour l'afficher dans la boutique publique de la plateforme", "en": "Add your cooperative's first product to display it in the platform's public store", "it": "Aggiungi il primo prodotto della vostra cooperativa per mostrarlo nel negozio pubblico della piattaforma", "es": "Añade el primer producto de vuestra cooperativa para mostrarlo en la tienda pública de la plataforma"},
  "أعلى المنتجات طلباً": {"fr": "Produits les plus demandés", "en": "Top ordered products", "it": "Prodotti più richiesti", "es": "Productos más solicitados"},
  "أملو تقليدي باللوز والعسل": {"fr": "Amlou traditionnel aux amandes et miel", "en": "Traditional amlou with almonds and honey", "it": "Amlou tradizionale con mandorle e miele", "es": "Amlou tradicional con almendras y miel"},
  "أُخفي المنتج من المتجر": {"fr": "Produit masqué de la boutique", "en": "Product hidden from the store", "it": "Prodotto nascosto dal negozio", "es": "Producto ocultado de la tienda"},
  "إتمام الطلب": {"fr": "Terminer la commande", "en": "Complete order", "it": "Completa l'ordine", "es": "Completar pedido"},
  "إجمالي الطلبات": {"fr": "Total des commandes", "en": "Total orders", "it": "Totale ordini", "es": "Total de pedidos"},
  "إجمالي المنتجات": {"fr": "Total des produits", "en": "Total products", "it": "Totale prodotti", "es": "Total de productos"},
  "إخفاء": {"fr": "Masquer", "en": "Hide", "it": "Nascondi", "es": "Ocultar"},
  "إدارة المتجر": {"fr": "Gestion de la boutique", "en": "Store management", "it": "Gestione del negozio", "es": "Gestión de la tienda"},
  "إضافة المنتج": {"fr": "Ajouter le produit", "en": "Add product", "it": "Aggiungi prodotto", "es": "Añadir producto"},
  "اختر منتج التعاونية": {"fr": "Choisir un produit de la coopérative", "en": "Select a cooperative product", "it": "Scegli un prodotto della cooperativa", "es": "Elige un producto de la cooperativa"},
  "استكشاف المنصة في وضع العرض": {"fr": "Explorer la plateforme en mode démonstration", "en": "Explore the platform in demo mode", "it": "Esplora la piattaforma in modalità demo", "es": "Explorar la plataforma en modo demo"},
  "اسم الزبون": {"fr": "Nom du client", "en": "Customer name", "it": "Nome del cliente", "es": "Nombre del cliente"},
  "اسم المستخدم الخاص بك": {"fr": "Votre nom d'utilisateur", "en": "Your username", "it": "Il tuo nome utente", "es": "Tu nombre de usuario"},
  "اسم المنتج": {"fr": "Nom du produit", "en": "Product name", "it": "Nome del prodotto", "es": "Nombre del producto"},
  "الإحصائيات والتقارير": {"fr": "Statistiques et rapports", "en": "Statistics and reports", "it": "Statistiche e report", "es": "Estadísticas e informes"},
  "الإيراد (د.م.)": {"fr": "Revenu (MAD)", "en": "Revenue (MAD)", "it": "Ricavo (MAD)", "es": "Ingresos (MAD)"},
  "الإيرادات المحققة": {"fr": "Revenus réalisés", "en": "Realized revenue", "it": "Ricavi realizzati", "es": "Ingresos realizados"},
  "الباك إند غير متصل حالياً — يمكنك استكشاف واجهة المنصة ببيانات عرض تجريبية": {"fr": "Le serveur n'est pas connecté actuellement — vous pouvez explorer l'interface avec des données de démonstration", "en": "The backend is currently unreachable — you can explore the interface with demo data", "it": "Il backend non è attualmente connesso — puoi esplorare l'interfaccia con dati dimostrativi", "es": "El backend no está conectado actualmente — puedes explorar la interfaz con datos de demostración"},
  "التوصيل بعد الخامسة مساءً": {"fr": "Livraison après 17 h", "en": "Delivery after 5 p.m.", "it": "Consegna dopo le 17", "es": "Entrega después de las 17 h"},
  "الرباط": {"fr": "Rabat", "en": "Rabat", "it": "Rabat", "es": "Rabat"},
  "السعر": {"fr": "Prix", "en": "Price", "it": "Prezzo", "es": "Precio"},
  "السعر (د.م.)": {"fr": "Prix (MAD)", "en": "Price (MAD)", "it": "Prezzo (MAD)", "es": "Precio (MAD)"},
  "السعر غير صالح": {"fr": "Prix invalide", "en": "Invalid price", "it": "Prezzo non valido", "es": "Precio no válido"},
  "الطلبات": {"fr": "Commandes", "en": "Orders", "it": "Ordini", "es": "Pedidos"},
  "الطلبات المكتملة": {"fr": "Commandes terminées", "en": "Completed orders", "it": "Ordini completati", "es": "Pedidos completados"},
  "الكمية: {n}": {"fr": "Quantité : {n}", "en": "Quantity: {n}", "it": "Quantità: {n}", "es": "Cantidad: {n}"},
  "المدينة (اختياري)": {"fr": "Ville (facultatif)", "en": "City (optional)", "it": "Città (opzionale)", "es": "Ciudad (opcional)"},
  "المنتج": {"fr": "Produit", "en": "Product", "it": "Prodotto", "es": "Producto"},
  "المنتج معروض الآن في المتجر": {"fr": "Le produit est maintenant affiché dans la boutique", "en": "The product is now displayed in the store", "it": "Il prodotto è ora visibile nel negozio", "es": "El producto ya está visible en la tienda"},
  "المنتجات": {"fr": "Produits", "en": "Products", "it": "Prodotti", "es": "Productos"},
  "الوصف": {"fr": "Description", "en": "Description", "it": "Descrizione", "es": "Descripción"},
  "بالكمية المطلوبة والإيراد المحقق": {"fr": "Par quantité demandée et revenu réalisé", "en": "By requested quantity and realized revenue", "it": "Per quantità richiesta e ricavo realizzato", "es": "Por cantidad solicitada e ingreso realizado"},
  "بيانات للعرض فقط — شغّل الباك إند المحلي للبيانات الحقيقية": {"fr": "Données de démonstration uniquement — démarrez le serveur local pour les données réelles", "en": "Demo data only — start the local backend for real data", "it": "Solo dati dimostrativi — avvia il backend locale per i dati reali", "es": "Solo datos de demostración — inicia el backend local para datos reales"},
  "تجميل وعناية": {"fr": "Beauté et soins", "en": "Beauty and care", "it": "Bellezza e cura", "es": "Belleza y cuidado"},
  "تحقق من تشغيل الباك إند أو اضبط عنوانه من الإعدادات": {"fr": "Vérifiez que le serveur est démarré ou configurez son adresse dans les paramètres", "en": "Make sure the backend is running or set its address in settings", "it": "Verifica che il backend sia avviato o imposta il suo indirizzo nelle impostazioni", "es": "Comprueba que el backend esté iniciado o configura su dirección en los ajustes"},
  "تراتبية الصلاحيات تمنع إدارة هذا الحساب": {"fr": "La hiérarchie des autorisations interdit la gestion de ce compte", "en": "The permission hierarchy prevents managing this account", "it": "La gerarchia dei permessi impedisce la gestione di questo account", "es": "La jerarquía de permisos impide gestionar esta cuenta"},
  "تسجيل الطلب": {"fr": "Enregistrer la commande", "en": "Save order", "it": "Registra l'ordine", "es": "Guardar pedido"},
  "تسجيل طلب": {"fr": "Enregistrer une commande", "en": "Record order", "it": "Registra un ordine", "es": "Registrar pedido"},
  "تسجيل طلب يدوي": {"fr": "Enregistrer une commande manuelle", "en": "Record a manual order", "it": "Registra un ordine manuale", "es": "Registrar pedido manual"},
  "تطور الطلبات أسبوعياً": {"fr": "Évolution hebdomadaire des commandes", "en": "Weekly orders trend", "it": "Andamento settimanale degli ordini", "es": "Evolución semanal de pedidos"},
  "تعديل منتج": {"fr": "Modifier le produit", "en": "Edit product", "it": "Modifica prodotto", "es": "Editar producto"},
  "تعذر التسجيل": {"fr": "Enregistrement impossible", "en": "Could not save", "it": "Impossibile registrare", "es": "No se pudo registrar"},
  "تم التواصل": {"fr": "Client contacté", "en": "Customer contacted", "it": "Cliente contattato", "es": "Cliente contactado"},
  "تم تحديث المنتج": {"fr": "Produit mis à jour", "en": "Product updated", "it": "Prodotto aggiornato", "es": "Producto actualizado"},
  "تم تحديث حالة الطلب": {"fr": "Statut de la commande mis à jour", "en": "Order status updated", "it": "Stato dell'ordine aggiornato", "es": "Estado del pedido actualizado"},
  "تم تسجيل الطلب": {"fr": "Commande enregistrée", "en": "Order recorded", "it": "Ordine registrato", "es": "Pedido registrado"},
  "تم حذف الطلب": {"fr": "Commande supprimée", "en": "Order deleted", "it": "Ordine eliminato", "es": "Pedido eliminado"},
  "تم حذف المنتج": {"fr": "Produit supprimé", "en": "Product deleted", "it": "Prodotto eliminato", "es": "Producto eliminado"},
  "تمت إضافة المنتج": {"fr": "Produit ajouté", "en": "Product added", "it": "Prodotto aggiunto", "es": "Producto añadido"},
  "توزيع حالات الطلبات": {"fr": "Répartition des statuts de commandes", "en": "Order status distribution", "it": "Distribuzione stati ordini", "es": "Distribución de estados de pedidos"},
  "تُضغط تلقائياً — اختيارية": {"fr": "Compressée automatiquement — facultatif", "en": "Automatically compressed — optional", "it": "Compressa automaticamente — facoltativo", "es": "Comprimida automáticamente — opcional"},
  "جديد + تم التواصل": {"fr": "Nouveau + contacté", "en": "New + contacted", "it": "Nuovo + contattato", "es": "Nuevo + contactado"},
  "حالة العرض": {"fr": "Statut d'affichage", "en": "Display status", "it": "Stato di visualizzazione", "es": "Estado de visualización"},
  "حالة الكتالوج": {"fr": "État du catalogue", "en": "Catalog status", "it": "Stato del catalogo", "es": "Estado del catálogo"},
  "حالة طلب غير صحيحة": {"fr": "Statut de commande invalide", "en": "Invalid order status", "it": "Stato ordine non valido", "es": "Estado de pedido no válido"},
  "حذف الطلب نهائياً؟": {"fr": "Supprimer définitivement la commande ?", "en": "Permanently delete the order?", "it": "Eliminare definitivamente l'ordine?", "es": "¿Eliminar definitivamente el pedido?"},
  "حذف المنتج نهائياً؟": {"fr": "Supprimer définitivement le produit ?", "en": "Permanently delete the product?", "it": "Eliminare definitivamente il prodotto?", "es": "¿Eliminar definitivamente el producto?"},
  "حساب رئيس التعاونية محمي حسب تراتبية الصلاحيات": {"fr": "Le compte du président de la coopérative est protégé par la hiérarchie des autorisations", "en": "The cooperative president's account is protected by the permission hierarchy", "it": "L'account del presidente della cooperativa è protetto dalla gerarchia dei permessi", "es": "La cuenta del presidente de la cooperativa está protegida por la jerarquía de permisos"},
  "حساب مالك المنصة محمي — يديره المالك حصراً": {"fr": "Le compte du propriétaire de la plateforme est protégé — géré exclusivement par le propriétaire", "en": "The platform owner's account is protected — managed by the owner only", "it": "L'account del proprietario della piattaforma è protetto — gestito esclusivamente dal proprietario", "es": "La cuenta del propietario de la plataforma está protegida — gestionada exclusivamente por el propietario"},
  "حساب محمي": {"fr": "Compte protégé", "en": "Protected account", "it": "Account protetto", "es": "Cuenta protegida"},
  "حسابات المسيرين يديرها رئيس التعاونية أو إدارة المنصة": {"fr": "Les comptes des gestionnaires sont gérés par le président de la coopérative ou l'administration de la plateforme", "en": "Manager accounts are managed by the cooperative president or platform administration", "it": "Gli account dei gestori sono gestiti dal presidente della cooperativa o dall'amministrazione della piattaforma", "es": "Las cuentas de los gestores las gestionan el presidente de la cooperativa o la administración de la plataforma"},
  "خلال": {"fr": "sur", "en": "over", "it": "in", "es": "en"},
  "خليط الأركان التقليدي — غير معروض مؤقتاً": {"fr": "Mélange d'argan traditionnel — temporairement non affiché", "en": "Traditional argan blend — temporarily not displayed", "it": "Miscela di argan tradizionale — temporaneamente non esposto", "es": "Mezcla de argán tradicional — temporalmente no mostrado"},
  "زائر (وضع العرض)": {"fr": "Visiteur (mode démo)", "en": "Visitor (demo mode)", "it": "Visitatore (modalità demo)", "es": "Visitante (modo demo)"},
  "ستظهر الإحصائيات فور توفر الطلبات": {"fr": "Les statistiques apparaîtront dès que des commandes seront disponibles", "en": "Statistics will appear once orders are available", "it": "Le statistiche appariranno non appena ci saranno ordini", "es": "Las estadísticas aparecerán en cuanto haya pedidos"},
  "ستظهر هنا ترتيب المنتجات فور وصول الطلبات": {"fr": "Le classement des produits apparaîtra dès l'arrivée des commandes", "en": "Product ranking will appear as soon as orders arrive", "it": "La classifica dei prodotti apparirà appena arrivano gli ordini", "es": "La clasificación de productos aparecerá en cuanto lleguen pedidos"},
  "ستظهر هنا طلبات الشراء الواردة من متجر المنصة — أو سجّل طلباً يدوياً بالزر أعلاه": {"fr": "Les commandes reçues via la boutique de la plateforme apparaîtront ici — ou enregistrez une commande manuelle avec le bouton ci-dessus", "en": "Purchase orders received from the platform store will appear here — or record a manual order with the button above", "it": "Gli ordini ricevuti dal negozio della piattaforma appariranno qui — oppure registra un ordine manuale con il pulsante sopra", "es": "Los pedidos recibidos de la tienda de la plataforma aparecerán aquí — o registra un pedido manual con el botón de arriba"},
  "سيُحذف {name} وكل طلباته المرتبطة — لا يمكن التراجع": {"fr": "{name} et toutes ses commandes associées seront supprimés — irréversible", "en": "{name} and all its associated orders will be deleted — this cannot be undone", "it": "{name} e tutti i suoi ordini associati verranno eliminati — irreversibile", "es": "Se eliminarán {name} y todos sus pedidos asociados — no se puede deshacer"},
  "صورة المنتج": {"fr": "Image du produit", "en": "Product image", "it": "Immagine del prodotto", "es": "Imagen del producto"},
  "طباعة التقرير": {"fr": "Imprimer le rapport", "en": "Print report", "it": "Stampa report", "es": "Imprimir informe"},
  "طلب {name} — لا يمكن التراجع عن الحذف": {"fr": "Commande de {name} — la suppression est irréversible", "en": "Order from {name} — deletion cannot be undone", "it": "Ordine di {name} — l'eliminazione è irreversibile", "es": "Pedido de {name} — la eliminación no se puede deshacer"},
  "طلب جديد": {"fr": "Nouvelle commande", "en": "New order", "it": "Nuovo ordine", "es": "Pedido nuevo"},
  "طلبات جديدة": {"fr": "Nouvelles commandes", "en": "New orders", "it": "Nuovi ordini", "es": "Pedidos nuevos"},
  "طلبات: {n}": {"fr": "Commandes : {n}", "en": "Orders: {n}", "it": "Ordini: {n}", "es": "Pedidos: {n}"},
  "ظهر الطلب في قائمة المعالجة بحالة جديد": {"fr": "La commande apparaît dans la liste de traitement au statut nouvelle", "en": "The order appears in the processing list as new", "it": "L'ordine appare nell'elenco di elaborazione come nuovo", "es": "El pedido aparece en la lista de procesamiento como nuevo"},
  "عدد الطلبات الواردة والمكتملة والإيرادات المحققة": {"fr": "Nombre de commandes reçues et terminées, et revenus réalisés", "en": "Number of received and completed orders, and realized revenue", "it": "Numero di ordini ricevuti e completati, e ricavi realizzati", "es": "Número de pedidos recibidos y completados, e ingresos realizados"},
  "عرض": {"fr": "Afficher", "en": "Show", "it": "Mostra", "es": "Mostrar"},
  "غير متوفرة في المخزون": {"fr": "En rupture de stock", "en": "Out of stock", "it": "Esaurite", "es": "Agotadas"},
  "كغ، لتر، قطعة...": {"fr": "kg, litre, pièce…", "en": "kg, litre, piece…", "it": "kg, litro, pezzo…", "es": "kg, litro, pieza…"},
  "لا توجد إحصائيات": {"fr": "Aucune statistique", "en": "No statistics", "it": "Nessuna statistica", "es": "No hay estadísticas"},
  "لا توجد تعاونية مرتبطة بحسابكم": {"fr": "Aucune coopérative n'est liée à votre compte", "en": "No cooperative is linked to your account", "it": "Nessuna cooperativa è collegata al vostro account", "es": "Ninguna cooperativa está vinculada a vuestra cuenta"},
  "لا توجد طلبات": {"fr": "Aucune commande", "en": "No orders", "it": "Nessun ordine", "es": "No hay pedidos"},
  "لا توجد طلبات بعد": {"fr": "Aucune commande pour le moment", "en": "No orders yet", "it": "Nessun ordine per ora", "es": "Aún no hay pedidos"},
  "لا توجد طلبات خلال الفترة": {"fr": "Aucune commande sur la période", "en": "No orders in the period", "it": "Nessun ordine nel periodo", "es": "No hay pedidos en el período"},
  "لا توجد منتجات بعد": {"fr": "Aucun produit pour le moment", "en": "No products yet", "it": "Nessun prodotto per ora", "es": "Aún no hay productos"},
  "لا توجد منتجات معروضة — أضف منتجاً أولاً من تبويب المنتجات": {"fr": "Aucun produit affiché — ajoutez d'abord un produit depuis l'onglet Produits", "en": "No products displayed — add a product first from the Products tab", "it": "Nessun prodotto esposto — aggiungi prima un prodotto dalla scheda Prodotti", "es": "No hay productos mostrados — añade primero un producto desde la pestaña Productos"},
  "لا يمكن تنفيذ إجراء على حسابك الخاص": {"fr": "Aucune action ne peut être appliquée à votre propre compte", "en": "No action can be applied to your own account", "it": "Non è possibile eseguire azioni sul proprio account", "es": "No se puede ejecutar una acción sobre vuestra propia cuenta"},
  "لا يمكن تنفيذ إجراء على حسابك الشخصي": {"fr": "Aucune action ne peut être appliquée à votre compte personnel", "en": "No action can be applied to your personal account", "it": "Non è possibile eseguire azioni sul proprio account personale", "es": "No se puede ejecutar una acción sobre vuestra cuenta personal"},
  "لا يمكنك حذف حسابك الشخصي": {"fr": "Vous ne pouvez pas supprimer votre propre compte", "en": "You cannot delete your own account", "it": "Non puoi eliminare il tuo account personale", "es": "No puedes eliminar tu propia cuenta"},
  "لطلب وصل هاتفياً أو حضورياً — يُسجَّل بحالة «طلب جديد» لمعالجته كغيره": {"fr": "Pour une commande reçue par téléphone ou en présentiel — enregistrée au statut « nouvelle » pour être traitée comme les autres", "en": "For an order received by phone or in person — recorded as 'new' to be processed like any other", "it": "Per un ordine ricevuto per telefono o di persona — registrato come «nuovo» per essere trattato come gli altri", "es": "Para un pedido recibido por teléfono o presencialmente — registrado como «nuevo» para procesarse como los demás"},
  "متوسط قيمة الطلب": {"fr": "Valeur moyenne de commande", "en": "Average order value", "it": "Valore medio ordine", "es": "Valor medio de pedido"},
  "متوفر في المخزون": {"fr": "En stock", "en": "In stock", "it": "Disponibile", "es": "En stock"},
  "محفوظ كمسودة مخفية — اعرضه عند الجاهزية": {"fr": "Enregistré comme brouillon masqué — affichez-le quand il est prêt", "en": "Saved as a hidden draft — display it when ready", "it": "Salvato come bozza nascosta — mostralo quando pronto", "es": "Guardado como borrador oculto — muéstralo cuando esté listo"},
  "مخفي": {"fr": "Masqué", "en": "Hidden", "it": "Nascosto", "es": "Oculto"},
  "مخفي (مسودة)": {"fr": "Masqué (brouillon)", "en": "Hidden (draft)", "it": "Nascosto (bozza)", "es": "Oculto (borrador)"},
  "مخفية (مسودات)": {"fr": "Masquées (brouillons)", "en": "Hidden (drafts)", "it": "Nascoste (bozze)", "es": "Ocultas (borradores)"},
  "مراكش": {"fr": "Marrakech", "en": "Marrakech", "it": "Marrakech", "es": "Marrakech"},
  "معروض": {"fr": "Affiché", "en": "Displayed", "it": "Esposto", "es": "Mostrado"},
  "معروض الآن في متجر المنصة": {"fr": "Actuellement affiché dans la boutique de la plateforme", "en": "Now displayed in the platform store", "it": "Ora visibile nel negozio della piattaforma", "es": "Ya visible en la tienda de la plataforma"},
  "معروض في المتجر": {"fr": "Affiché dans la boutique", "en": "Displayed in store", "it": "Esposto nel negozio", "es": "Mostrado en la tienda"},
  "معروضة في المتجر": {"fr": "Affichées dans la boutique", "en": "Displayed in store", "it": "Esposte nel negozio", "es": "Mostradas en la tienda"},
  "مكتمل": {"fr": "Terminé", "en": "Completed", "it": "Completato", "es": "Completado"},
  "مكتملة": {"fr": "Terminées", "en": "Completed", "it": "Completati", "es": "Completados"},
  "ملاحظة (اختياري)": {"fr": "Note (facultatif)", "en": "Note (optional)", "it": "Nota (opzionale)", "es": "Nota (opcional)"},
  "ملغاة": {"fr": "Annulées", "en": "Cancelled", "it": "Annullati", "es": "Cancelados"},
  "منتج جديد": {"fr": "Nouveau produit", "en": "New product", "it": "Nuovo prodotto", "es": "Producto nuevo"},
  "منتج مميز": {"fr": "Produit vedette", "en": "Featured product", "it": "Prodotto in evidenza", "es": "Producto destacado"},
  "منتجات التعاونية المعروضة في متجر المنصة العمومي": {"fr": "Produits de la coopérative affichés dans la boutique publique de la plateforme", "en": "Cooperative products displayed in the platform's public store", "it": "Prodotti della cooperativa esposti nel negozio pubblico della piattaforma", "es": "Productos de la cooperativa mostrados en la tienda pública de la plataforma"},
  "منتجات التعاونية في متجر المنصة: إضافة الطلبات ومعالجتها ومراقبة الإحصائيات والتقارير": {"fr": "Produits de la coopérative dans la boutique de la plateforme : ajout et traitement des commandes, suivi des statistiques et rapports", "en": "Cooperative products in the platform store: adding and processing orders, monitoring statistics and reports", "it": "Prodotti della cooperativa nel negozio della piattaforma: aggiunta ed elaborazione degli ordini, monitoraggio di statistiche e report", "es": "Productos de la cooperativa en la tienda de la plataforma: añadir y procesar pedidos, seguimiento de estadísticas e informes"},
  "منتجات مميزة": {"fr": "Produits vedettes", "en": "Featured products", "it": "Prodotti in evidenza", "es": "Productos destacados"},
  "منتجات وطلبات {coop} في متجر المنصة: المعالجة والإحصائيات والتقارير": {"fr": "Produits et commandes de {coop} dans la boutique de la plateforme : traitement, statistiques et rapports", "en": "Products and orders of {coop} in the platform store: processing, statistics and reports", "it": "Prodotti e ordini di {coop} nel negozio della piattaforma: elaborazione, statistiche e report", "es": "Productos y pedidos de {coop} en la tienda de la plataforma: procesamiento, estadísticas e informes"},
  "نسبة الإتمام": {"fr": "Taux d'achèvement", "en": "Completion rate", "it": "Tasso di completamento", "es": "Tasa de finalización"},
  "نسبة كل حالة خلال الفترة المحددة": {"fr": "Part de chaque statut sur la période sélectionnée", "en": "Share of each status over the selected period", "it": "Quota di ogni stato nel periodo selezionato", "es": "Proporción de cada estado en el período seleccionado"},
  "نفد المخزون": {"fr": "Rupture de stock", "en": "Out of stock", "it": "Esaurito", "es": "Agotado"},
  "هدية — تغليف خاص": {"fr": "Cadeau — emballage spécial", "en": "Gift — special packaging", "it": "Regalo — confezione speciale", "es": "Regalo — embalaje especial"},
  "هذا الحساب خارج نطاق صلاحياتك": {"fr": "Ce compte est hors de votre champ d'autorisation", "en": "This account is outside your permission scope", "it": "Questo account è fuori dal tuo ambito di autorizzazione", "es": "Esta cuenta está fuera de vuestro ámbito de permisos"},
  "هذا الطلب خارج نطاق تعاونيتكم": {"fr": "Cette commande est hors du périmètre de votre coopérative", "en": "This order is outside your cooperative's scope", "it": "Questo ordine è fuori dal perimetro della vostra cooperativa", "es": "Este pedido está fuera del ámbito de vuestra cooperativa"},
  "وحدة البيع (اختياري)": {"fr": "Unité de vente (facultatif)", "en": "Sales unit (optional)", "it": "Unità di vendita (opzionale)", "es": "Unidad de venta (opcional)"},
  "يوماً": {"fr": "jours", "en": "days", "it": "giorni", "es": "días"},
}

def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)

for lang in ["fr", "en", "it", "es"]:
    path = ROOT / f"{lang}.ts"
    src = path.read_text()
    existing = set(re.findall(r'^\s*"([^"]+)":', src, re.M))
    added, skipped = 0, 0
    lines = [f"\n  // ─── الإصدار 1.3.0: إدارة المتجر + تراتبية الحماية + الدخول ─────"]
    for ar, tr in T.items():
        if ar in existing:
            skipped += 1
            continue
        lines.append(f"  {js_str(ar)}: {js_str(tr[lang])},")
        added += 1
    if added:
        # إدراج قبل الإغلاق الأخير };
        idx = src.rstrip().rfind("};")
        src = src[:idx] + "\n".join(lines) + "\n" + src[idx:]
        path.write_text(src)
    print(f"{lang}: +{added} (متخطاة {skipped})")

print("تم الدمج ✓")
