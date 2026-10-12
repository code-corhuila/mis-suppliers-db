const password = process.env.MONGO_SUPPLIERS_PASSWORD;
if (!password) throw new Error("Missing suppliers credential.");
const connection = new Mongo("mongodb://suppliers_app:" + encodeURIComponent(password) + "@mongo:27017/suppliers?authSource=suppliers&replicaSet=rs0");
const domain = connection.getDB("suppliers");
const names = domain.getCollectionNames();
if (!names.includes("suppliers") || !names.includes("creation_requests")) throw new Error("Missing collections.");
if (!domain.suppliers.getIndexes().some(index => index.name === "uq_document" && index.unique)) throw new Error("Missing document index.");
if (!domain.creation_requests.getIndexes().some(index => index.name === "uq_intention" && index.unique)) throw new Error("Missing intention index.");
if (!names.includes("receipts") || !names.includes("receipt_requests")) throw new Error("Missing receipt collections.");
for (const name of ["uq_reference", "uq_workflow"]) {
    if (!domain.receipts.getIndexes().some(index => index.name === name && index.unique)) throw new Error("Missing receipt index.");
}
if (!domain.receipt_requests.getIndexes().some(index => index.name === "uq_receipt_intention" && index.unique)) throw new Error("Missing receipt intention index.");
let badReceipt = false;
try { domain.receipts.insertOne({_id:"00000000-0000-0000-0000-000000000001",status:"CONFIRMED"}); }
catch (error) { if (error.code === 121) badReceipt = true; else throw error; }
if (!badReceipt) throw new Error("Receipt validator accepted incomplete data.");
let rejected = false;
try { domain.suppliers.insertOne({_id: UUID().toString(), name: "Incomplete probe"}); }
catch (error) { if (error.code === 121) rejected = true; else throw error; }
if (!rejected) throw new Error("Validator accepted incomplete supplier.");
const id = "00000000-0000-0000-0000-" + new ObjectId().toString().slice(-12);
const session = connection.startSession();
try {
    session.startTransaction();
    const database = session.getDatabase("suppliers");
    database.suppliers.insertOne({_id:id, documentNumber:("PROBE-"+id.slice(-12)).toUpperCase(), name:"Synthetic probe",
        phone:null, email:null, address:null, active:true, createdAt:new Date(), createdBy:id});
    let failed = false;
    try { database.creation_requests.insertOne({_id:id}); }
    catch (error) { if (error.code === 121) failed = true; else throw error; }
    try { session.abortTransaction(); } catch (error) { if (error.code !== 251) throw error; }
    if (!failed || domain.suppliers.countDocuments({_id:id}) !== 0) throw new Error("Partial write survived failed transaction.");
    let denied = false;
    try { connection.getDB("admin").getCollection("__suppliers_probe").insertOne({_id:id}); }
    catch (error) { if (error.code === 13) denied = true; else throw error; }
    if (!denied) throw new Error("Domain user unexpectedly writes admin data.");
    session.startTransaction();
    database.receipts.insertOne({_id:id,supplierId:id,medicationId:id,workflowId:id,initiatedBy:id,
        reference:("PROBE-"+id.slice(-12)).toUpperCase(),lotNumber:"PROBE",expiresOn:"2099-01-01",quantity:NumberInt(10),
        status:"PENDING",createdBy:id,createdAt:new Date(),changedBy:null,changedAt:null,traceId:"native-receipt-probe"});
    let receiptFailed = false;
    try { database.receipt_requests.insertOne({_id:id}); }
    catch (error) { if (error.code === 121) receiptFailed = true; else throw error; }
    try { session.abortTransaction(); } catch (error) { if (error.code !== 251) throw error; }
    if (!receiptFailed || domain.receipts.countDocuments({_id:id}) !== 0) throw new Error("Partial receipt survived failed intention.");
    print("PASS: suppliers/receipts validators, unique indexes, transaction atomicity and domain isolation.");
} finally { session.endSession(); }
