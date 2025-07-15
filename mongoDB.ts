import { Db, MongoClient} from 'mongodb'
let db: Db
let mongoClientObj: any;


const open = async (): Promise<boolean> => {
    let uri = "mongodb://localhost:27017"
    if (process.env.MONGODB_URI) {
        uri = process.env.MONGODB_URI
    }

    console.info("Connecting to MongoDB at " + uri)

    const status = await MongoClient.connect(uri, {
    }).then(async (client) => {
        mongoClientObj = client

        console.info("MongoDB connected successfully!")
        return true
    }).catch((error) => {
        console.error(error)
        console.error("Error connecting to MongoDB")
        return false
    })
    return status
}

let getDB = () => {
    return db
}

const getMongoClientObj = (): MongoClient => {
    return mongoClientObj
}

const getCollections = (serverID?: any) => {
    if (process.env.STOCKPILER_MULTI_SERVER && process.env.STOCKPILER_MULTI_SERVER === "true") {
        const db = mongoClientObj.db('stockpiler-' + serverID)
        const collections = {
            stockpiles: db.collection('stockpiles'),
            targets: db.collection('targets'),
            config: db.collection('config'),
            facilities:db.collection('facilities')
        }
        return collections
    }
    else {
        const db = mongoClientObj.db('stockpiler')
        const collections = {
            stockpiles: db.collection('stockpiles'),
            targets: db.collection('targets'),
            config: db.collection('config'),
            facilities:db.collection('facilities')
        }
        return collections
    } 

}


export { open, getDB, getCollections, getMongoClientObj }
